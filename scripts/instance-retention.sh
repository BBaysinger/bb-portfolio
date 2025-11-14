#!/usr/bin/env bash
set -euo pipefail

# instance-retention.sh
# Prune old bb-portfolio EC2 instances after blue-green promotions.
# Keeps a configurable number (or age window) of previously demoted instances (Role=previous)
# and terminates older ones after optional snapshot of their root volume.
#
# Tag Conventions relied upon:
#   Project=bb-portfolio
#   Role=active|candidate|previous
#   Version=<deployment_version value or timestamp>
#   LastDemoted=<UTC timestamp when EIP handover demoted former active>
#   PromotionTimestamp=<UTC timestamp when instance became active>
#
# Selection logic:
#   1. Enumerate all running or stopped instances tagged Project=bb-portfolio AND Role=previous.
#   2. For each, derive a sortable demote timestamp: prefer LastDemoted tag; fallback to LaunchTime.
#   3. Sort descending (newest first). Keep the newest RETAIN_COUNT; older ones become prune candidates.
#   4. If RETAIN_DAYS is set, only prune those whose demote timestamp is older than RETAIN_DAYS.
#   5. For each prune candidate: optional snapshot (root volume) then terminate.
#
# Safety:
#   - Never touches Role=active or Role=candidate.
#   - Dry-run shows planned terminations & snapshots only.
#   - Explicit confirmation required unless --force supplied.
#
# Usage examples:
#   scripts/instance-retention.sh --region us-west-2 --retain-count 2
#   scripts/instance-retention.sh --retain-count 3 --retain-days 7 --snapshot-before
#   scripts/instance-retention.sh --dry-run
#   scripts/instance-retention.sh --force --retain-count 1 --snapshot-before
#
# Exit codes:
#   0 success / nothing to prune
#   1 invalid arguments / missing tools
#   2 AWS query failure
#
REGION="us-west-2"
RETAIN_COUNT=2
RETAIN_DAYS=""     # if set, days threshold
SNAPSHOT_BEFORE=false
DRY_RUN=false
FORCE=false
PROJECT_TAG="bb-portfolio"
NOW_EPOCH=$(date -u +%s)

log() { printf "\033[0;34m[retention] %s\033[0m\n" "$*"; }
warn() { printf "\033[1;33m[retention][warn] %s\033[0m\n" "$*"; }
err() { printf "\033[0;31m[retention][error] %s\033[0m\n" "$*" >&2; }

usage() {
  cat <<USAGE
EC2 instance retention pruning for bb-portfolio (blue-green)

Options:
  --region <aws-region>    AWS region (default: us-west-2)
  --retain-count <n>       Number of previous instances (Role=previous) to keep (default: 2)
  --retain-days <n>        Minimum age in days before termination (used in addition to retain-count)
  --snapshot-before        Snapshot root volume of each pruned instance before termination
  --dry-run                Show planned actions only, make no AWS changes
  --force                  Skip interactive confirmation prompt
  -h|--help                Show this help and exit

Logic: keep newest <retain-count> previous instances. Older ones pruned if also older than --retain-days (if provided).
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --region) REGION="$2"; shift 2;;
    --retain-count) RETAIN_COUNT="$2"; shift 2;;
    --retain-days) RETAIN_DAYS="$2"; shift 2;;
    --snapshot-before) SNAPSHOT_BEFORE=true; shift;;
    --dry-run) DRY_RUN=true; shift;;
    --force) FORCE=true; shift;;
    -h|--help) usage; exit 0;;
    *) err "Unknown argument: $1"; usage; exit 1;;
  esac
done

need() { command -v "$1" >/dev/null 2>&1 || { err "Missing required command: $1"; exit 1; }; }
need aws; need jq; need date

[[ "$RETAIN_COUNT" =~ ^[0-9]+$ ]] || { err "--retain-count must be integer"; exit 1; }
if [[ -n "$RETAIN_DAYS" ]]; then
  [[ "$RETAIN_DAYS" =~ ^[0-9]+$ ]] || { err "--retain-days must be integer"; exit 1; }
fi

log "Region: $REGION | retain-count: $RETAIN_COUNT | retain-days: ${RETAIN_DAYS:-<none>} | snapshot-before: $SNAPSHOT_BEFORE | dry-run: $DRY_RUN"

# Fetch instances with Role=previous
JSON=$(aws ec2 describe-instances \
  --region "$REGION" \
  --filters "Name=tag:Project,Values=$PROJECT_TAG" "Name=tag:Role,Values=previous" "Name=instance-state-name,Values=running,stopped" \
  --query 'Reservations[].Instances[]' --output json 2>/dev/null) || { err "AWS describe-instances failed"; exit 2; }

COUNT=$(jq 'length' <<<"$JSON")
[[ "$COUNT" -eq 0 ]] && { log "No previous instances found; nothing to prune."; exit 0; }

log "Found $COUNT previous instance(s). Building retention model..."

# Build table: InstanceId, LaunchTimeEpoch, DemoteEpoch, LastDemotedTag, Version
TABLE=$(jq -r '.[ ] | (.Tags // []) as $tags | {
  InstanceId: .InstanceId,
  LaunchTime: .LaunchTime,
  LaunchTimeEpoch: (.LaunchTime | sub("\\.\\d+Z$"; "Z") | strptime("%Y-%m-%dT%H:%M:%S%Z") | mktime),
  LastDemoted: ($tags[]? | select(.Key=="LastDemoted") | .Value) // "",
  Version: ($tags[]? | select(.Key=="Version") | .Value) // ""
} | .DemoteEpoch = (if (.LastDemoted | length) > 0 then (.LastDemoted | sub("\\.\\d+Z$"; "Z") | strptime("%Y-%m-%dT%H:%M:%S%Z") | mktime) else .LaunchTimeEpoch end) | [.InstanceId, .Version, .LastDemoted, (.DemoteEpoch|tostring), (.LaunchTimeEpoch|tostring)] | @tsv' <<<"$JSON")

mapfile -t ROWS <<<"$TABLE"

# Sort by DemoteEpoch descending (newest first)
SORTED=$(printf '%s\n' "${ROWS[@]}" | sort -k4 -nr)
mapfile -t SORTED_ROWS <<<"$SORTED"

PRUNE=()
KEEP=()
index=0
for row in "${SORTED_ROWS[@]}"; do
  (( index++ ))
  IFS=$'\t' read -r iid version lastDemoted demoteEpoch launchEpoch <<<"$row"
  ageDays=$(python3 - <<PY 2>/dev/null || echo 0
import time
now=$NOW_EPOCH
demote=int($demoteEpoch)
print(int((now-demote)/86400))
PY
)
  if (( index <= RETAIN_COUNT )); then
    KEEP+=("$iid|ver=$version|demoted=${lastDemoted:-launch}|ageDays=$ageDays")
  else
    # Apply days filter if provided
    if [[ -n "$RETAIN_DAYS" ]] && (( ageDays < RETAIN_DAYS )); then
      KEEP+=("$iid|ver=$version|demoted=${lastDemoted:-launch}|ageDays=$ageDays (under days threshold)")
    else
      PRUNE+=("$iid|ver=$version|demoted=${lastDemoted:-launch}|ageDays=$ageDays")
    fi
  fi
done

log "Keep set (newest first):"
for k in "${KEEP[@]}"; do echo "  KEEP  $k"; done

if (( ${#PRUNE[@]} == 0 )); then
  log "No instances qualify for pruning under current policy."; exit 0
fi

log "Prune candidates:"; for p in "${PRUNE[@]}"; do echo "  PRUNE $p"; done

if [[ "$DRY_RUN" == true ]]; then
  log "Dry-run mode: no snapshots or terminations executed."
  exit 0
fi

if [[ "$FORCE" != true ]]; then
  echo "Type 'prune' to confirm termination of ${#PRUNE[@]} instance(s):"; read -r ans
  [[ "$ans" == prune ]] || { err "Confirmation not received. Aborting."; exit 1; }
fi

for entry in "${PRUNE[@]}"; do
  iid=${entry%%|*}
  log "Processing prune candidate $iid"
  if [[ "$SNAPSHOT_BEFORE" == true ]]; then
    volId=$(aws ec2 describe-instances --region "$REGION" --instance-ids "$iid" --query "Reservations[0].Instances[0].BlockDeviceMappings[?DeviceName=='/dev/xvda'].Ebs.VolumeId" --output text 2>/dev/null || true)
    if [[ -n "$volId" && "$volId" != None ]]; then
      snapDesc="bb-portfolio retention pre-terminate $(date -u +%Y-%m-%dT%H-%M-%SZ)";
      snapId=$(aws ec2 create-snapshot --region "$REGION" --volume-id "$volId" --description "$snapDesc" --tag-specifications 'ResourceType=snapshot,Tags=[{Key=Name,Value=bb-portfolio-retention}]' --query 'SnapshotId' --output text 2>/dev/null || true)
      if [[ -n "$snapId" && "$snapId" != None ]]; then
        log "  Snapshot created: $snapId"
      else
        warn "  Snapshot creation failed for volume $volId"
      fi
    else
      warn "  Root volume not found; skipping snapshot"
    fi
  fi
  log "  Terminating instance $iid"
  aws ec2 terminate-instances --region "$REGION" --instance-ids "$iid" --query 'TerminatingInstances[0].CurrentState.Name' --output text || warn "Termination API call failed for $iid"
done

log "Retention pruning completed."
exit 0
