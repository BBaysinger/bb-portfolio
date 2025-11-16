#!/usr/bin/env bash
set -euo pipefail

################################################################################
# BB Portfolio Orchestrator-Promote (moved to deploy/scripts/)
################################################################################
# Promotes blue (candidate) EC2 instance to active (production) by swapping
# the production Elastic IP (or performing null-green initial activation when
# no active instance exists). See deployment docs for gating logic.

# Original implementation retained; path updated for new convention.

REGION="us-west-2"
PROMOTE=true
DRY_RUN=false
ROLLBACK_ON_FAIL=false
SNAPSHOT_BEFORE=false
AUTO_APPROVE=false
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
  --health-only              Only check health without promoting (default: perform promotion after health checks)
  --auto-promote             Auto-approve promotion after health checks (skips confirmation prompt)
  --auto-approve             Deprecated alias for --auto-promote
  --dry-run                  Show actions without executing state changes (no swap, no tagging)
  --rollback-on-fail         If post-swap health fails, attempt rollback to previous active
  --snapshot-before          Create snapshot of active root volume before swap (Name=bb-portfolio-pre-handover)
  --max-retries <n>          Health check retry count (default: 8)
  --interval <seconds>       Interval between health retries (default: 8)
  -h|--help                  Show help
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --region) REGION="$2"; shift 2;;
    --health-only) PROMOTE=false; shift;;
    --auto-promote) AUTO_APPROVE=true; shift;;
    --auto-approve) warn "--auto-approve is deprecated; use --auto-promote"; AUTO_APPROVE=true; shift;;
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

if [[ "$PROMOTE" == true && "$AUTO_APPROVE" != true ]]; then
  log "Promotion requested. This script will:"
  log "  1) Discover active and candidate instances"
  log "  2) Run candidate health checks"
  log "  3) Swap production EIP to candidate (on confirmation)"
  printf "Type 'yes' to proceed with promotion flow: "
  read -r response
  if [[ "$response" != "yes" ]]; then
    log "Promotion cancelled by user (pre-check)."
    exit 0
  fi
fi

discover_instance_id() {
  local role="$1"
  aws ec2 describe-instances \
    --region "$REGION" \
    --filters "Name=tag:Project,Values=$TAG_PROJECT" "Name=tag:$TAG_KEY_ROLE,Values=$role" "Name=instance-state-name,Values=running" \
    --query 'Reservations[].Instances[].InstanceId' --output text | awk 'NF'
}

ACTIVE_ID=$(discover_instance_id active || true)
CANDIDATE_ID=$(discover_instance_id candidate || true)

NULL_GREEN_MODE=false
if [[ -z "$CANDIDATE_ID" ]]; then
  err "Candidate instance not found (Role=candidate)."; exit 2
fi
if [[ -z "$ACTIVE_ID" ]]; then
  warn "Active absent; entering null-green mode (initial activation)."
  NULL_GREEN_MODE=true
fi

log "Candidate instance: $CANDIDATE_ID"
[[ "$NULL_GREEN_MODE" == false ]] && log "Active instance: $ACTIVE_ID" || log "Null-green initial activation path"

get_public_ip() {
  local iid="$1"
  aws ec2 describe-instances --region "$REGION" --instance-ids "$iid" \
    --query 'Reservations[0].Instances[0].PublicIpAddress' --output text
}

ACTIVE_IP=""
CANDIDATE_IP=$(get_public_ip "$CANDIDATE_ID")
[[ -z "$CANDIDATE_IP" || "$CANDIDATE_IP" == "None" ]] && { err "Candidate public IP not found."; exit 2; }
log "Candidate public IP: $CANDIDATE_IP"

EIP_ALLOC_ID=""; EIP_PUBLIC_IP=""
if [[ "$NULL_GREEN_MODE" == false ]]; then
  ACTIVE_IP=$(get_public_ip "$ACTIVE_ID")
  log "Active public IP:    $ACTIVE_IP"
  EIP_INFO=$(aws ec2 describe-addresses --region "$REGION" --filters "Name=instance-id,Values=$ACTIVE_ID" --query 'Addresses[0]' --output json || echo '{}')
  EIP_ALLOC_ID=$(jq -r '.AllocationId // empty' <<<"$EIP_INFO")
  EIP_PUBLIC_IP=$(jq -r '.PublicIp // empty' <<<"$EIP_INFO")
  [[ -z "$EIP_ALLOC_ID" || -z "$EIP_PUBLIC_IP" ]] && { err "Elastic IP associated with active instance not found."; exit 2; }
  log "Production Elastic IP: $EIP_PUBLIC_IP (AllocationId: $EIP_ALLOC_ID)"
else
  EIP_INFO=$(aws ec2 describe-addresses --region "$REGION" --filters "Name=instance-id,Values=$CANDIDATE_ID" --query 'Addresses[0]' --output json || echo '{}')
  EIP_ALLOC_ID=$(jq -r '.AllocationId // empty' <<<"$EIP_INFO")
  EIP_PUBLIC_IP=$(jq -r '.PublicIp // empty' <<<"$EIP_INFO")
  [[ -n "$EIP_PUBLIC_IP" ]] && log "Elastic IP present: $EIP_PUBLIC_IP (AllocationId: $EIP_ALLOC_ID)" || warn "No Elastic IP associated; using public IP $CANDIDATE_IP"
fi

status_checks_pass() {
  local iid="$1"
  local st sys
  st=$(aws ec2 describe-instance-status --instance-ids "$iid" --region "$REGION" --query 'InstanceStatuses[0].InstanceStatus.Status' --output text 2>/dev/null || true)
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
  local probe_ip="$CANDIDATE_IP"
  local token=$(curl -s -X PUT --connect-timeout 1 --max-time 2 "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 21600" 2>/dev/null || echo "")
  local current_ip=""
  if [[ -n "$token" ]]; then
    current_ip=$(curl -s -H "X-aws-ec2-metadata-token: $token" --connect-timeout 1 --max-time 2 http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo "")
  fi
  if [[ -n "$current_ip" && "$current_ip" == "$CANDIDATE_IP" ]]; then
    probe_ip="localhost"
  fi
  while (( attempt <= MAX_RETRIES )); do
    if status_checks_pass "$CANDIDATE_ID" && http_ok "http://${probe_ip}:3000/" && http_ok "http://${probe_ip}:3001/api/health/"; then
      return 0
    fi
    sleep "$INTERVAL"; ((attempt++))
  done
  return 1
}

health_probe_active_post_swap() {
  local attempt=1
  while (( attempt <= MAX_RETRIES )); do
    if status_checks_pass "$CANDIDATE_ID" && \
       http_ok "http://$EIP_PUBLIC_IP:3000/" && \
       http_ok "http://$EIP_PUBLIC_IP:3001/api/health/"; then
      return 0
    fi
    sleep "$INTERVAL"; ((attempt++))
  done
  return 1
}

log "Pre-swap candidate health check (timeout ${TIMEOUT_SECS}s)"
health_probe_candidate || { err "Candidate failed health checks."; exit 3; }
log "Candidate passes pre-swap health checks."

if [[ "$PROMOTE" != true ]]; then
  log "--health-only specified; exiting after successful health verification."; exit 0
fi

if [[ "$NULL_GREEN_MODE" == true ]]; then
  if [[ "$DRY_RUN" == true ]]; then
    log "[dry-run] Would tag $CANDIDATE_ID Role=active (null-green initial activation)"
  else
    aws ec2 create-tags --resources "$CANDIDATE_ID" --region "$REGION" --tags Key=$TAG_KEY_ROLE,Value=active Key=PromotionTimestamp,Value=$TIMESTAMP >/dev/null || warn "Failed to tag candidate as active"
  fi
  [[ -n "$EIP_PUBLIC_IP" ]] && log "Null-green activation complete at Elastic IP $EIP_PUBLIC_IP" || log "Null-green activation complete; reachable at $CANDIDATE_IP"
  exit 0
fi

if [[ "$SNAPSHOT_BEFORE" == true ]]; then
  ROOT_VOL=$(aws ec2 describe-instances --instance-ids "$ACTIVE_ID" --region "$REGION" --query "Reservations[0].Instances[0].BlockDeviceMappings[?DeviceName=='/dev/xvda'].Ebs.VolumeId" --output text || true)
  if [[ -n "$ROOT_VOL" && "$ROOT_VOL" != "None" ]]; then
    if [[ "$DRY_RUN" == true ]]; then
      log "[dry-run] Would snapshot $ROOT_VOL"
    else
      SNAP_ID=$(aws ec2 create-snapshot --volume-id "$ROOT_VOL" --region "$REGION" --description "bb-portfolio pre-handover $TIMESTAMP" --tag-specifications 'ResourceType=snapshot,Tags=[{Key=Name,Value=bb-portfolio-pre-handover}]' --query 'SnapshotId' --output text || true)
      log "Snapshot created: $SNAP_ID"
    fi
  else
    warn "Root volume not found; skipping snapshot"
  fi
fi

perform_swap() { [[ "$DRY_RUN" == true ]] && log "[dry-run] Would associate EIP $EIP_ALLOC_ID to $CANDIDATE_ID" || aws ec2 associate-address --allow-reassociation --allocation-id "$EIP_ALLOC_ID" --instance-id "$CANDIDATE_ID" --region "$REGION" >/dev/null; }
update_tags() {
  if [[ "$DRY_RUN" == true ]]; then
    log "[dry-run] Would tag $ACTIVE_ID Role=previous & $CANDIDATE_ID Role=active"
  else
    aws ec2 create-tags --resources "$ACTIVE_ID" --region "$REGION" --tags Key=$TAG_KEY_ROLE,Value=previous Key=LastDemoted,Value=$TIMESTAMP >/dev/null || warn "Tag previous failed"
    aws ec2 create-tags --resources "$CANDIDATE_ID" --region "$REGION" --tags Key=$TAG_KEY_ROLE,Value=active Key=PromotionTimestamp,Value=$TIMESTAMP >/dev/null || warn "Tag active failed"
  fi
}
swap_security_groups() {
  local active_sg candidate_sg
  active_sg=$(aws ec2 describe-instances --instance-ids "$ACTIVE_ID" --region "$REGION" --query 'Reservations[0].Instances[0].SecurityGroups[0].GroupId' --output text)
  candidate_sg=$(aws ec2 describe-instances --instance-ids "$CANDIDATE_ID" --region "$REGION" --query 'Reservations[0].Instances[0].SecurityGroups[0].GroupId' --output text)
  if [[ "$DRY_RUN" == true ]]; then
    log "[dry-run] Would swap SGs: $CANDIDATE_ID->$active_sg, $ACTIVE_ID->$candidate_sg"
  else
    aws ec2 modify-instance-attribute --instance-id "$CANDIDATE_ID" --region "$REGION" --groups "$active_sg" >/dev/null || warn "SG update failed (candidate)"
    aws ec2 modify-instance-attribute --instance-id "$ACTIVE_ID" --region "$REGION" --groups "$candidate_sg" >/dev/null || warn "SG update failed (active)"
  fi
}
rollback_swap() {
  if [[ "$DRY_RUN" == true ]]; then
    log "[dry-run] Would rollback EIP to $ACTIVE_ID"
  else
    aws ec2 associate-address --allow-reassociation --allocation-id "$EIP_ALLOC_ID" --instance-id "$ACTIVE_ID" --region "$REGION" >/dev/null || warn "Rollback EIP failed"
    aws ec2 create-tags --resources "$ACTIVE_ID" --region "$REGION" --tags Key=$TAG_KEY_ROLE,Value=active >/dev/null || true
    aws ec2 create-tags --resources "$CANDIDATE_ID" --region "$REGION" --tags Key=$TAG_KEY_ROLE,Value=candidate >/dev/null || true
  fi
}

if [[ "$AUTO_APPROVE" != true && "$DRY_RUN" != true ]]; then
  log "Ready to promote candidate $CANDIDATE_ID (EIP $EIP_PUBLIC_IP)"
  printf "Type 'yes' to confirm: "; read -r response; [[ "$response" == yes ]] || { log "Promotion cancelled"; exit 0; }
fi

log "Associating Elastic IP & swapping security groups"
perform_swap; swap_security_groups; update_tags
log "Post-swap health verification (timeout ${TIMEOUT_SECS}s)"
if ! health_probe_active_post_swap; then
  err "Post-swap health failed"
  if [[ "$ROLLBACK_ON_FAIL" == true ]]; then
    warn "Attempting rollback..."; rollback_swap; exit 4
  else
    warn "Rollback disabled; manual intervention required"; exit 4
  fi
fi

log "Promotion successful: candidate now active at Elastic IP $EIP_PUBLIC_IP"
exit 0
