#!/usr/bin/env bash
set -euo pipefail

# eip-handover.sh
# Safely promote a blue/"candidate" EC2 instance to active by re-associating the production Elastic IP.
# Performs health checks before and after swap, supports rollback, tagging, and optional snapshot.
#
# Assumptions / Conventions:
# - Instances are tagged: Project=bb-portfolio, Role=active|candidate (Version optional)
# - Active instance currently owns the production Elastic IP (EIP)
# - Candidate instance has passed provisioning but may not yet have containers deployed
# - AWS CLI is configured; permissions: ec2:Describe*, ec2:AssociateAddress, ec2:CreateSnapshot (optional), ec2:CreateTags
#
# Usage examples:
#   scripts/eip-handover.sh --region us-west-2 --promote
#   scripts/eip-handover.sh --region us-west-2 --promote --rollback-on-fail --max-retries 12 --interval 10
#   scripts/eip-handover.sh --region us-west-2 --dry-run
#   scripts/eip-handover.sh --region us-west-2 --snapshot-before --promote
#
# Health Checks (pre & post):
#   1. Instance status: both system & instance checks pass (AWS 2/2)
#   2. HTTP 200 from candidate frontend (port 3000) root path
#   3. HTTP 200 from candidate backend /api/health (port 3001)
#
# Rollback logic triggers if post-swap health fails and --rollback-on-fail specified.
#
# Exit codes:
#   0 success
#   1 usage / argument errors
#   2 discovery errors (missing active/candidate/EIP)
#   3 health check failed pre-swap (no changes made)
#   4 swap attempted but post-swap health failed (rollback maybe executed)

REGION="us-west-2"
PROMOTE=false
DRY_RUN=false
ROLLBACK_ON_FAIL=false
SNAPSHOT_BEFORE=false
MAX_RETRIES=8
INTERVAL=8
TIMEOUT_SECS=$((MAX_RETRIES*INTERVAL))
TAG_PROJECT="bb-portfolio"
TAG_KEY_ROLE="Role"
TIMESTAMP="$(date -u +%Y-%m-%dT%H-%M-%SZ)"

log() { printf "\033[0;34m[handover] %s\033[0m\n" "$*"; }
warn() { printf "\033[1;33m[handover][warn] %s\033[0m\n" "$*"; }
err() { printf "\033[0;31m[handover][error] %s\033[0m\n" "$*" >&2; }

usage() {
  cat <<USAGE
Blue/Green Elastic IP Handover for bb-portfolio

Options:
  --region <aws-region>      AWS region (default: us-west-2)
  --promote                  Perform the handover (without this flag script only checks health & prints status)
  --dry-run                  Show actions without executing state changes (no swap, no tagging)
  --rollback-on-fail         If post-swap health fails, attempt rollback to previous active
  --snapshot-before          Create snapshot of active root volume before swap (Name=bb-portfolio-pre-handover)
  --max-retries <n>          Health check retry count (default: 8)
  --interval <seconds>       Interval between health retries (default: 8)
  -h|--help                  Show help

Health targets (candidate pre-swap & active post-swap):
  Frontend: http://<public-ip>:3000/            expecting 200
  Backend:  http://<public-ip>:3001/api/health/ expecting 200

Environment overrides:
  AWS_PROFILE, AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --region) REGION="$2"; shift 2;;
    --promote) PROMOTE=true; shift;;
    --dry-run) DRY_RUN=true; shift;;
    --rollback-on-fail) ROLLBACK_ON_FAIL=true; shift;;
    --snapshot-before) SNAPSHOT_BEFORE=true; shift;;
    --max-retries) MAX_RETRIES="$2"; shift 2;;
    --interval) INTERVAL="$2"; shift 2;;
    -h|--help) usage; exit 0;;
    *) err "Unknown argument: $1"; usage; exit 1;;
  esac
done

TIMEOUT_SECS=$((MAX_RETRIES*INTERVAL))

need() { command -v "$1" >/dev/null 2>&1 || { err "Missing required command: $1"; exit 1; }; }
need aws; need jq; need curl

discover_instance_id() {
  local role="$1"
  aws ec2 describe-instances \
    --region "$REGION" \
    --filters "Name=tag:Project,Values=$TAG_PROJECT" "Name=tag:$TAG_KEY_ROLE,Values=$role" "Name=instance-state-name,Values=running" \
    --query 'Reservations[].Instances[].InstanceId' --output text | awk 'NF'
}

ACTIVE_ID=$(discover_instance_id active || true)
CANDIDATE_ID=$(discover_instance_id candidate || true)

if [[ -z "$ACTIVE_ID" ]]; then err "Active instance not found (Role=active)."; exit 2; fi
if [[ -z "$CANDIDATE_ID" ]]; then err "Candidate instance not found (Role=candidate)."; exit 2; fi

log "Active instance: $ACTIVE_ID"
log "Candidate instance: $CANDIDATE_ID"

get_public_ip() {
  local iid="$1"
  aws ec2 describe-instances --region "$REGION" --instance-ids "$iid" \
    --query 'Reservations[0].Instances[0].PublicIpAddress' --output text
}

ACTIVE_IP=$(get_public_ip "$ACTIVE_ID")
CANDIDATE_IP=$(get_public_ip "$CANDIDATE_ID")
if [[ -z "$CANDIDATE_IP" || "$CANDIDATE_IP" == "None" ]]; then err "Candidate public IP not found."; exit 2; fi
log "Candidate public IP: $CANDIDATE_IP"
log "Active public IP:    $ACTIVE_IP"

# Find production Elastic IP allocation id (attached to active instance)
EIP_INFO=$(aws ec2 describe-addresses --region "$REGION" --filters "Name=instance-id,Values=$ACTIVE_ID" --query 'Addresses[0]' --output json || echo '{}')
EIP_ALLOC_ID=$(jq -r '.AllocationId // empty' <<<"$EIP_INFO")
EIP_PUBLIC_IP=$(jq -r '.PublicIp // empty' <<<"$EIP_INFO")
if [[ -z "$EIP_ALLOC_ID" || -z "$EIP_PUBLIC_IP" ]]; then err "Elastic IP associated with active instance not found."; exit 2; fi
log "Production Elastic IP: $EIP_PUBLIC_IP (AllocationId: $EIP_ALLOC_ID)"

status_checks_pass() {
  local iid="$1"
  local st
  st=$(aws ec2 describe-instance-status --instance-ids "$iid" --region "$REGION" --query 'InstanceStatuses[0].InstanceStatus.Status' --output text 2>/dev/null || true)
  local sys
  sys=$(aws ec2 describe-instance-status --instance-ids "$iid" --region "$REGION" --query 'InstanceStatuses[0].SystemStatus.Status' --output text 2>/dev/null || true)
  [[ "$st" == "ok" && "$sys" == "ok" ]]
}

http_ok() {
  local url="$1" code
  code=$(curl -s -o /dev/null -w '%{http_code}' --connect-timeout 3 --max-time 20 "$url" || echo "000")
  [[ "$code" == "200" ]]
}

health_probe_candidate() {
  local attempt=1
  # Detect if we're running on the candidate itself (using IMDSv2)
  local probe_ip="$CANDIDATE_IP"
  local token=$(curl -s -X PUT --connect-timeout 1 --max-time 2 "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 21600" 2>/dev/null || echo "")
  local current_ip=""
  if [[ -n "$token" ]]; then
    current_ip=$(curl -s -H "X-aws-ec2-metadata-token: $token" --connect-timeout 1 --max-time 2 http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo "")
  fi
  echo "[handover] Current instance IP from metadata: $current_ip"
  if [[ -n "$current_ip" ]] && [[ "$current_ip" == "$CANDIDATE_IP" ]]; then
    probe_ip="localhost"
    echo "[handover] Running on candidate itself, using localhost for health checks"
  else
    echo "[handover] Running remotely, probing public IP $probe_ip"
  fi
  
  while (( attempt <= MAX_RETRIES )); do
    echo "[handover] Health check attempt $attempt/$MAX_RETRIES"
    echo "[handover]   Checking EC2 instance status..."
    if ! status_checks_pass "$CANDIDATE_ID"; then
      echo "[handover]   ✗ Instance status check failed"
    elif ! http_ok "http://${probe_ip}:3000/"; then
      echo "[handover]   ✗ Frontend http://${probe_ip}:3000/ failed or timed out"
    elif ! http_ok "http://${probe_ip}:3001/api/health/"; then
      echo "[handover]   ✗ Backend http://${probe_ip}:3001/api/health/ failed or timed out"
    else
      echo "[handover]   ✓ All health checks passed"
      ok_pre=true; return 0
    fi
    sleep "$INTERVAL"; ((attempt++))
  done
  return 1
}

health_probe_active_post_swap() {
  local attempt=1
  while (( attempt <= MAX_RETRIES )); do
    if status_checks_pass "$CANDIDATE_ID" && \
       http_ok "http://$EIP_PUBLIC_IP/" && \
       http_ok "http://$EIP_PUBLIC_IP/api/health/"; then
      return 0
    fi
    sleep "$INTERVAL"; ((attempt++))
  done
  return 1
}

log "Pre-swap candidate health check (timeout ${TIMEOUT_SECS}s)"
if ! health_probe_candidate; then
  err "Candidate failed health checks (frontend+backend or instance status). Aborting."
  exit 3
fi
log "Candidate passes pre-swap health checks."

if [[ "$PROMOTE" != true ]]; then
  log "--promote not specified; exiting after successful health verification."
  exit 0
fi

if [[ "$SNAPSHOT_BEFORE" == true ]]; then
  warn "Snapshot before promotion requested."
  ROOT_VOL=$(aws ec2 describe-instances --instance-ids "$ACTIVE_ID" --region "$REGION" --query "Reservations[0].Instances[0].BlockDeviceMappings[?DeviceName=='/dev/xvda'].Ebs.VolumeId" --output text || true)
  if [[ -n "$ROOT_VOL" && "$ROOT_VOL" != "None" ]]; then
    if [[ "$DRY_RUN" == true ]]; then
      log "[dry-run] Would create snapshot of $ROOT_VOL"
    else
      SNAP_ID=$(aws ec2 create-snapshot --volume-id "$ROOT_VOL" --region "$REGION" --description "bb-portfolio pre-handover $TIMESTAMP" --tag-specifications 'ResourceType=snapshot,Tags=[{Key=Name,Value=bb-portfolio-pre-handover}]' --query 'SnapshotId' --output text || true)
      log "Created snapshot: $SNAP_ID"
    fi
  else
    warn "Root volume not found; skipping snapshot."
  fi
fi

perform_swap() {
  if [[ "$DRY_RUN" == true ]]; then
    log "[dry-run] Would associate EIP $EIP_ALLOC_ID to candidate $CANDIDATE_ID"
  else
    aws ec2 associate-address --allow-reassociation --allocation-id "$EIP_ALLOC_ID" --instance-id "$CANDIDATE_ID" --region "$REGION" >/dev/null
  fi
}

update_tags() {
  if [[ "$DRY_RUN" == true ]]; then
    log "[dry-run] Would tag $ACTIVE_ID Role=previous, $CANDIDATE_ID Role=active"
  else
    aws ec2 create-tags --resources "$ACTIVE_ID" --region "$REGION" --tags Key=$TAG_KEY_ROLE,Value=previous Key=LastDemoted,Value=$TIMESTAMP >/dev/null
    aws ec2 create-tags --resources "$CANDIDATE_ID" --region "$REGION" --tags Key=$TAG_KEY_ROLE,Value=active Key=PromotionTimestamp,Value=$TIMESTAMP >/dev/null
  fi
}

rollback_swap() {
  if [[ "$DRY_RUN" == true ]]; then
    log "[dry-run] Would rollback EIP to $ACTIVE_ID"
  else
    aws ec2 associate-address --allow-reassociation --allocation-id "$EIP_ALLOC_ID" --instance-id "$ACTIVE_ID" --region "$REGION" >/dev/null || warn "Rollback association failed"
    # Restore tags
    aws ec2 create-tags --resources "$ACTIVE_ID" --region "$REGION" --tags Key=$TAG_KEY_ROLE,Value=active >/dev/null || true
    aws ec2 create-tags --resources "$CANDIDATE_ID" --region "$REGION" --tags Key=$TAG_KEY_ROLE,Value=candidate >/dev/null || true
  fi
}

log "Associating Elastic IP to candidate instance (promotion)"
perform_swap
update_tags

log "Post-swap health verification via Elastic IP (timeout ${TIMEOUT_SECS}s)"
if ! health_probe_active_post_swap; then
  err "Post-swap health failed"
  if [[ "$ROLLBACK_ON_FAIL" == true ]]; then
    warn "Attempting rollback..."
    rollback_swap
    exit 4
  else
    warn "Rollback disabled; manual intervention required"
    exit 4
  fi
fi

log "Promotion successful: candidate now active at Elastic IP $EIP_PUBLIC_IP"
log "Consider scheduling termination for previous instance after retention window."
exit 0
