#!/usr/bin/env bash
set -euo pipefail

# Create or remove a temporary Security Group allowing SSH (22/tcp) from your current public IP
# and attach/detach it to/from a target instance. Useful to recover SSH when the server stalls
# during SSH banner exchange.
#
# Usage examples:
#   ./deploy/scripts/sg-temp-ssh-access.sh --role active
#   ./deploy/scripts/sg-temp-ssh-access.sh --instance-id i-0123456789abcdef0
#   ./deploy/scripts/sg-temp-ssh-access.sh --role candidate --remove
#
# Notes:
# - Requires AWS CLI. Honors AWS_PROFILE and default credentials.
# - Region defaults to us-west-2.

REGION="us-west-2"
ROLE=""
INSTANCE_ID=""
REMOVE=false
PROJECT_TAG="bb-portfolio"

usage(){ cat <<USAGE
sg-temp-ssh-access.sh - attach a temporary SSH-only SG from your IP

Options:
  --role <active|candidate>  Target instance by Role tag
  --instance-id <id>         Target explicit EC2 instance id
  --region <region>          AWS region (default: us-west-2)
  --remove                   Detach and delete previously attached temp SG(s)
  -h|--help                  Show help

Examples:
  ./sg-temp-ssh-access.sh --role active
  ./sg-temp-ssh-access.sh --instance-id i-0123 --remove
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --role) ROLE="$2"; shift 2;;
    --instance-id) INSTANCE_ID="$2"; shift 2;;
    --region) REGION="$2"; shift 2;;
    --remove) REMOVE=true; shift;;
    -h|--help) usage; exit 0;;
    *) echo "Unknown arg: $1" >&2; usage; exit 1;;
  esac
done

need(){ command -v "$1" >/dev/null 2>&1 || { echo "Missing command: $1" >&2; exit 1; }; }
need aws

if [[ -z "$INSTANCE_ID" && -z "$ROLE" ]]; then
  echo "Must specify --instance-id or --role" >&2; exit 2
fi

if [[ -n "$ROLE" ]]; then
  INSTANCE_ID=$(aws ec2 describe-instances --region "$REGION" \
    --filters "Name=tag:Project,Values=$PROJECT_TAG" "Name=tag:Role,Values=$ROLE" "Name=instance-state-name,Values=running" \
    --query 'Reservations[].Instances[0].InstanceId' --output text | awk 'NF' || true)
  [[ -z "$INSTANCE_ID" || "$INSTANCE_ID" == "None" ]] && { echo "No running instance found for role=$ROLE" >&2; exit 3; }
fi

# Fetch instance details
read -r VPC_ID CURR_SGS <<<"$(aws ec2 describe-instances --region "$REGION" --instance-ids "$INSTANCE_ID" \
  --query 'Reservations[0].Instances[0].[VpcId,SecurityGroups[].GroupId]' --output text | awk '{print $1, $2}')"
if [[ -z "$VPC_ID" || "$VPC_ID" == "None" ]]; then
  echo "Unable to determine VPC for $INSTANCE_ID" >&2; exit 4
fi

if [[ "$REMOVE" == true ]]; then
  # Detach and delete any Purpose=temp-ssh SGs attached to the instance
  TMP_SG_IDS=$(aws ec2 describe-security-groups --region "$REGION" \
    --filters "Name=vpc-id,Values=$VPC_ID" "Name=tag:Project,Values=$PROJECT_TAG" "Name=tag:Purpose,Values=temp-ssh" \
    --query 'SecurityGroups[].GroupId' --output text | tr '\t' ' ' || true)
  if [[ -z "$TMP_SG_IDS" ]]; then
    echo "No temp-ssh SGs found in VPC to remove."; exit 0
  fi
  # Current groups on instance (compat with macOS Bash 3.2: no mapfile)
  CURR_LIST_STR=$(aws ec2 describe-instances --region "$REGION" --instance-ids "$INSTANCE_ID" \
    --query 'Reservations[0].Instances[0].SecurityGroups[].GroupId' --output text | tr '\t' ' ')
  IFS=' ' read -r -a CURRENT_GROUPS <<< "$CURR_LIST_STR"
  # Remove any temp-ssh SGs from the list
  NEW_GROUPS=()
  for g in "${CURRENT_GROUPS[@]}"; do
    if ! grep -qw "$g" <<<"$TMP_SG_IDS"; then NEW_GROUPS+=("$g"); fi
  done
  if [[ ${#NEW_GROUPS[@]} -eq 0 ]]; then
    echo "Refusing to leave instance without any SGs; add a non-temp SG first." >&2; exit 5
  fi
  aws ec2 modify-instance-attribute --region "$REGION" --instance-id "$INSTANCE_ID" --groups "${NEW_GROUPS[@]}" >/dev/null
  # Now delete the temp SGs
  for sg in $TMP_SG_IDS; do
    aws ec2 delete-security-group --region "$REGION" --group-id "$sg" >/dev/null 2>&1 || true
  done
  echo "Detached and deleted temp-ssh SGs: $TMP_SG_IDS"
  exit 0
fi

OPERATOR_IP=$(curl -s https://checkip.amazonaws.com || curl -s ifconfig.me || true)
OPERATOR_IP=$(echo "$OPERATOR_IP" | tr -d '\r' | tr -d '\n')
[[ -z "$OPERATOR_IP" ]] && { echo "Unable to determine operator IP" >&2; exit 6; }

TS=$(date -u +%Y%m%d-%H%M%S)
SG_NAME="bb-portfolio-temp-ssh-$TS"
DESC="Temporary SSH from $OPERATOR_IP/32"

SG_ID=$(aws ec2 create-security-group --region "$REGION" --group-name "$SG_NAME" --description "$DESC" --vpc-id "$VPC_ID" --query 'GroupId' --output text)
aws ec2 create-tags --region "$REGION" --resources "$SG_ID" \
  --tags Key=Name,Value=bb-portfolio-temp-ssh Key=Project,Value="$PROJECT_TAG" Key=Purpose,Value=temp-ssh Key=CreatedAt,Value="$TS" >/dev/null

aws ec2 authorize-security-group-ingress --region "$REGION" --group-id "$SG_ID" --ip-permissions IpProtocol=tcp,FromPort=22,ToPort=22,IpRanges='[{CidrIp="'"$OPERATOR_IP"'/32",Description="SSH from operator"}]' >/dev/null

# Attach to instance (append to existing groups) - compat for Bash 3.2
CURR_LIST_STR=$(aws ec2 describe-instances --region "$REGION" --instance-ids "$INSTANCE_ID" \
  --query 'Reservations[0].Instances[0].SecurityGroups[].GroupId' --output text | tr '\t' ' ')
IFS=' ' read -r -a CURRENT_GROUPS <<< "$CURR_LIST_STR"
NEW_GROUPS=("${CURRENT_GROUPS[@]}" "$SG_ID")
aws ec2 modify-instance-attribute --region "$REGION" --instance-id "$INSTANCE_ID" --groups "${NEW_GROUPS[@]}" >/dev/null

echo "Attached temp SG $SG_ID ($SG_NAME) to $INSTANCE_ID allowing 22/tcp from $OPERATOR_IP/32"
echo "To remove: ./deploy/scripts/sg-temp-ssh-access.sh --instance-id $INSTANCE_ID --region $REGION --remove"
