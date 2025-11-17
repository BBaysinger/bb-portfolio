#!/usr/bin/env bash
# Quick helper to retag the current green/active instance as a candidate (blue)
# so the promotion script can be exercised without a full orchestrator run.
#
# WARNING:
#   - This does NOT create a separate instance; production traffic will still
#     hit the same EC2 via the production Elastic IP.
#   - After demotion there is NO instance tagged Role=active. The promotion
#     script will enter null-green mode and simply (re)associate the PROD_EIP
#     to the same instance and retag it back to active.
#   - Do not leave the system indefinitely without an active instance tag.
#   - Use the --revert flag to restore Role=active when finished testing.
#
# Optional dangerous flag:
#   --detach-prod-eip : Disassociates the production Elastic IP temporarily.
#                       This will cause downtime until you run the promotion
#                       script (which will reattach it). Use ONLY for swap path
#                       testing; otherwise omit.
#
# Usage examples:
#   AWS_PROFILE=bb-portfolio-user bash deploy/scripts/demote-active-to-candidate.sh
#   AWS_PROFILE=bb-portfolio-user bash deploy/scripts/orchestrator-promote.sh --auto-promote --collect-diagnostics
#   AWS_PROFILE=bb-portfolio-user bash deploy/scripts/demote-active-to-candidate.sh --revert
#
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Source EIP constants if present
if [[ -f "$SCRIPT_DIR/lib/eips.sh" ]]; then
  # shellcheck disable=SC1091
  source "$SCRIPT_DIR/lib/eips.sh"
fi
REGION="us-west-2"
MODE="demote"            # demote | revert
DETACH_PROD_EIP=false
DRY_RUN=false

usage(){ cat <<USAGE
Demote active instance to candidate (or revert).

Flags:
  --revert            Revert a previously demoted instance back to Role=active
  --detach-prod-eip   (DANGER) Disassociate production Elastic IP (causes downtime until promotion)
  --dry-run           Show planned actions only
  --region <aws>      AWS region (default: us-west-2)
  -h|--help           Show help
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --revert) MODE="revert"; shift;;
    --detach-prod-eip) DETACH_PROD_EIP=true; shift;;
    --dry-run) DRY_RUN=true; shift;;
    --region) REGION="$2"; shift 2;;
    -h|--help) usage; exit 0;;
    *) echo "Unknown flag: $1" >&2; usage; exit 1;;
  esac
done

log(){ printf '\033[0;34m[demote] %s\033[0m\n' "$*"; }
warn(){ printf '\033[1;33m[demote][warn] %s\033[0m\n' "$*"; }
err(){ printf '\033[0;31m[demote][error] %s\033[0m\n' "$*" >&2; }

need(){ command -v "$1" >/dev/null 2>&1 || { err "Missing required command: $1"; exit 1; }; }
need aws; need jq

get_active_instance(){
  aws ec2 describe-instances --region "$REGION" \
    --filters "Name=tag:Project,Values=bb-portfolio" "Name=tag:Role,Values=active" "Name=instance-state-name,Values=running" \
    --query 'Reservations[].Instances[0].InstanceId' --output text 2>/dev/null | awk 'NF'
}

ACTIVE_ID="$(get_active_instance || true)"
if [[ -z "$ACTIVE_ID" ]]; then
  if [[ "$MODE" == "demote" ]]; then
    err "No active instance found to demote."; exit 2
  else
    err "No active instance found; nothing to revert."; exit 2
  fi
fi
log "Active instance: $ACTIVE_ID"

get_current_role(){
  aws ec2 describe-instances --region "$REGION" --instance-ids "$ACTIVE_ID" --query 'Reservations[0].Instances[0].Tags[?Key==`Role`].Value|[0]' --output text 2>/dev/null || true
}
CUR_ROLE="$(get_current_role)"
log "Current Role tag: ${CUR_ROLE:-<none>}"

get_prod_eip_assoc(){
  aws ec2 describe-addresses --region "$REGION" --public-ips "${PROD_EIP:-}" --query 'Addresses[0].AssociationId' --output text 2>/dev/null || true
}
get_prod_eip_alloc(){
  aws ec2 describe-addresses --region "$REGION" --public-ips "${PROD_EIP:-}" --query 'Addresses[0].AllocationId' --output text 2>/dev/null || true
}
PROD_ASSOC="$(get_prod_eip_assoc || true)"
PROD_ALLOC="$(get_prod_eip_alloc || true)"
if [[ -n "${PROD_EIP:-}" ]]; then
  log "Production EIP: $PROD_EIP (Alloc: ${PROD_ALLOC:-unknown} Assoc: ${PROD_ASSOC:-none})"
else
  warn "PROD_EIP constant not available; EIP detach option will be ignored."
fi

if [[ "$MODE" == "demote" ]]; then
  log "Demotion path: retag active → candidate (blue)"
  if [[ "$CUR_ROLE" != "active" ]]; then
    warn "Instance is not currently tagged active (Role=$CUR_ROLE); proceeding anyway."
  fi
  if [[ "$DETACH_PROD_EIP" == true ]]; then
    if [[ -n "$PROD_ASSOC" && -n "$PROD_ALLOC" ]]; then
      if [[ "$DRY_RUN" == true ]]; then
        log "[dry-run] Would disassociate PROD_EIP $PROD_EIP from $ACTIVE_ID"
      else
        log "Disassociating production EIP (downtime begins)"
        aws ec2 disassociate-address --association-id "$PROD_ASSOC" --region "$REGION" || warn "Failed to disassociate production EIP"
      fi
    else
      warn "Production EIP association not found; skipping detach"
    fi
  fi
  if [[ "$DRY_RUN" == true ]]; then
    log "[dry-run] Would tag $ACTIVE_ID Role=candidate Name=bb-portfolio-blue"
  else
    aws ec2 create-tags --resources "$ACTIVE_ID" --region "$REGION" \
      --tags Key=Role,Value=candidate Key=Name,Value=bb-portfolio-blue Key=DemotedForTest,Value="$(date -u +%Y-%m-%dT%H-%M-%SZ)" \
      >/dev/null || warn "Failed to retag instance"
    ok="Retag complete. Instance is now test candidate."
    log "$ok"
  fi
  log "Next: run promotion script (null-green mode) to retag back to active:"
  printf "  AWS_PROFILE=bb-portfolio-user bash deploy/scripts/orchestrator-promote.sh --auto-promote --collect-diagnostics\n"
elif [[ "$MODE" == "revert" ]]; then
  log "Revert path: retag back to active"
  if [[ "$CUR_ROLE" == "active" ]]; then
    log "Instance already active; nothing to do."; exit 0
  fi
  if [[ "$DRY_RUN" == true ]]; then
    log "[dry-run] Would tag $ACTIVE_ID Role=active Name=bb-portfolio-green"
  else
    aws ec2 create-tags --resources "$ACTIVE_ID" --region "$REGION" \
      --tags Key=Role,Value=active Key=Name,Value=bb-portfolio-green Key=RevertedFromTest,Value="$(date -u +%Y-%m-%dT%H-%M-%SZ)" \
      >/dev/null || warn "Failed to revert tags"
    log "Instance reverted to active." 
  fi
  log "If you detached the PROD_EIP earlier and it is free, promotion script will re-associate automatically when run."
fi
