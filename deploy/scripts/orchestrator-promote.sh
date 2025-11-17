#!/usr/bin/env bash
set -euo pipefail
################################################################################
# Orchestrator: Blue → Green Promotion (bb-portfolio)
#
# Purpose:
#   Promotes the current BLUE/candidate EC2 instance to ACTIVE/production by
#   associating the production Elastic IP and swapping security groups and tags.
#   Supports safe "null-green" initial activation where no active instance exists.
#
# EIP Constants:
#   Centralized in deploy/scripts/lib/eips.sh
#     - PROD_EIP (green/active): 44.246.43.116
#     - BLUE_EIP (candidate):    52.37.142.50
#     - RED_EIP  (tainted):      35.167.120.233
#   You can override these via environment variables when invoking this script.
#
# Key Behaviors:
#   - Performs pre-swap health checks against the candidate instance
#   - Null-green: if no active instance, associates PROD_EIP to the candidate
#     (if not already) and promotes without erroring on missing green
#   - After association, verifies health via the production EIP (fallback to
#     candidate IP if EIP not yet resolvable)
#
# Typical usage:
#   deploy/scripts/orchestrator-promote.sh --auto-promote
#   AWS_PROFILE=bb-portfolio-user deploy/scripts/orchestrator-promote.sh --auto-promote
#
# Flags:
#   --health-only, --auto-promote, --dry-run, --rollback-on-fail, --snapshot-before
#   --max-retries <n>, --interval <seconds>, --region <aws-region>
################################################################################

################################################################################
# BB Portfolio Orchestrator-Promote (moved to deploy/scripts/)
################################################################################
# Promotes blue (candidate) EC2 instance to active (production) by swapping
# the production Elastic IP (or performing null-green initial activation when
# no active instance exists). See deployment docs for gating logic.

# Original implementation retained; path updated for new convention.

# Resolve script directory for sourcing shared libs
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Source centralized EIP constants (allows env override)
if [[ -f "$SCRIPT_DIR/lib/eips.sh" ]]; then
  # shellcheck disable=SC1091
  source "$SCRIPT_DIR/lib/eips.sh"
else
  # Fallback defaults if lib not present (should exist)
  PROD_EIP="${PROD_EIP:-44.246.43.116}"
  BLUE_EIP="${BLUE_EIP:-52.37.142.50}"
  RED_EIP="${RED_EIP:-35.167.120.233}"
fi

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
SKIP_CERTS=false
CERTBOT_TIMEOUT_SECS=${CERTBOT_TIMEOUT_SECS:-300}
COLLECT_DIAG=false
ASSUME_HEALTHY=false
POST_SWAP_LOCAL=false
FAST_MODE=false
SCRIPT_START_EPOCH=$(date +%s)
STREAM_CERTBOT=false
REBOOT_ON_SSH_HANG=false
FORCE_SSM_CERTS=false

# Network preflight flags (auto-set)
SSH_REACHABLE="unknown"
HTTP_80_REACHABLE="unknown"

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
  --dry-run                  Show actions without executing state changes (no swap, no tagging)
  --rollback-on-fail         If post-swap health fails, attempt rollback to previous active
  --snapshot-before          Create snapshot of active root volume before swap (Name=bb-portfolio-pre-handover)
  --max-retries <n>          Health check retry count (default: 8)
  --interval <seconds>       Interval between health retries (default: 8)
  --skip-certs               Skip HTTPS certificate ensure step entirely
  --certbot-timeout <secs>   Timeout in seconds for certbot operations (default: 180)
  --collect-diagnostics      Collect remote logs (certbot/nginx/caddy) and network state after cert step or on failures
  --assume-healthy           Bypass candidate pre-swap health (useful after manual demote from active)
  --post-swap-local          Run post-swap health via SSH (localhost curls) instead of external IP
  --fast                     Minimize timing (retries=3 interval=3 skip certs unless override)
  --stream-certbot           Stream remote certbot log output in real-time during issuance/renewal
  --reboot-on-ssh-hang       If SSH stalls during banner exchange or is unreachable, reboot the instance and recheck
  --certs-via-ssm            Force cert issuance/renewal via SSM (fallback to SSH if SSM unavailable)
  -h|--help                  Show help
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --region) REGION="$2"; shift 2;;
    --health-only) PROMOTE=false; shift;;
    --auto-promote) AUTO_APPROVE=true; shift;;
    --dry-run) DRY_RUN=true; shift;;
    --rollback-on-fail) ROLLBACK_ON_FAIL=true; shift;;
    --snapshot-before) SNAPSHOT_BEFORE=true; shift;;
    --max-retries) MAX_RETRIES="$2"; shift 2;;
    --interval) INTERVAL="$2"; shift 2;;
    --skip-certs) SKIP_CERTS=true; shift;;
    --certbot-timeout) CERTBOT_TIMEOUT_SECS="$2"; shift 2;;
    --collect-diagnostics) COLLECT_DIAG=true; shift;;
    --assume-healthy) ASSUME_HEALTHY=true; shift;;
    --post-swap-local) POST_SWAP_LOCAL=true; shift;;
    --fast) FAST_MODE=true; shift;;
    --stream-certbot) STREAM_CERTBOT=true; shift;;
    --reboot-on-ssh-hang) REBOOT_ON_SSH_HANG=true; shift;;
    --certs-via-ssm) FORCE_SSM_CERTS=true; shift;;
    -h|--help) usage; exit 0;;
    *) err "Unknown argument: $1"; usage; exit 1;;
  esac
done
collect_certbot_diagnostics() {
  local tgt_ip="$1"; shift || true
  local reason="${1:-unspecified}"
  local local_dir="$(pwd)/deploy/logs/promote-${TIMESTAMP}"
  mkdir -p "$local_dir"
  log "Collecting diagnostics from $tgt_ip (reason: $reason) -> $local_dir"

  local SSH_KEY_DEFAULT="$HOME/.ssh/bb-portfolio-site-key.pem"
  local SSH_ARGS=()
  if [[ -f "$SSH_KEY_DEFAULT" ]]; then SSH_ARGS+=("-i" "$SSH_KEY_DEFAULT"); fi
  local SSH_OPTS=("-o" "StrictHostKeyChecking=no" "-o" "UserKnownHostsFile=/dev/null" "-o" "ConnectTimeout=5")

  # Build a remote bundle of useful diagnostics, then copy locally
  ssh "${SSH_ARGS[@]}" "${SSH_OPTS[@]}" "ec2-user@${tgt_ip}" env TIMESTAMP="$TIMESTAMP" bash -lc '
    set -e
    RDIR="/tmp/bb-diag-${TIMESTAMP}"
    mkdir -p "$RDIR"
    echo "reason: '"${reason}"'" > "$RDIR/reason.txt" 2>/dev/null || true

    # Service status
    for s in nginx caddy certbot; do
      sudo systemctl status "$s" >"$RDIR/systemctl-${s}.txt" 2>&1 || true
      sudo journalctl -u "$s" -n 500 >"$RDIR/journal-${s}.log" 2>&1 || true
    done

    # Open ports and processes
    (ss -tulpen || netstat -tulpen || true) >"$RDIR/ports.txt" 2>&1 || true
    ps aux >"$RDIR/ps-aux.txt" 2>&1 || true
    sudo iptables -S >"$RDIR/iptables-S.txt" 2>&1 || true
    sudo firewall-cmd --state >"$RDIR/firewalld-state.txt" 2>&1 || true
    sudo firewall-cmd --list-all >"$RDIR/firewalld-list.txt" 2>&1 || true

    # Configs
    sudo cp -f /etc/nginx/nginx.conf "$RDIR/nginx.conf" 2>/dev/null || true
    sudo cp -rf /etc/nginx/sites-enabled "$RDIR/nginx-sites-enabled" 2>/dev/null || true
    sudo cp -f /etc/caddy/Caddyfile "$RDIR/Caddyfile" 2>/dev/null || true

    # Logs
    sudo mkdir -p "$RDIR/logs" 2>/dev/null || true
    sudo cp -rf /var/log/nginx "$RDIR/logs/nginx" 2>/dev/null || true
    sudo cp -rf /var/log/caddy "$RDIR/logs/caddy" 2>/dev/null || true
    sudo cp -rf /var/log/letsencrypt "$RDIR/logs/letsencrypt" 2>/dev/null || true

    # DNS checks
    for d in bbaysinger.com www.bbaysinger.com dev.bbaysinger.com; do
      (dig +short A "$d" || true) >"$RDIR/dns-${d}.txt" 2>&1 || true
    done

    # Tarball
    tar -C "/tmp" -czf "/tmp/bb-diag-${TIMESTAMP}.tar.gz" "bb-diag-${TIMESTAMP}" || true
  '

  # Copy artifact locally
  scp "${SSH_ARGS[@]}" "${SSH_OPTS[@]}" "ec2-user@${tgt_ip}:/tmp/bb-diag-${TIMESTAMP}.tar.gz" "$local_dir/" >/dev/null 2>&1 || warn "Failed to copy diagnostics bundle"

  # Attempt cleanup
  ssh "${SSH_ARGS[@]}" "${SSH_OPTS[@]}" "ec2-user@${tgt_ip}" env TIMESTAMP="$TIMESTAMP" bash -lc '
    rm -rf "/tmp/bb-diag-${TIMESTAMP}" "/tmp/bb-diag-${TIMESTAMP}.tar.gz" || true
  ' >/dev/null 2>&1 || true
}

need() { command -v "$1" >/dev/null 2>&1 || { err "Missing required command: $1"; exit 1; }; }
need aws; need jq; need curl; need dig

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

if [[ "$FAST_MODE" == true ]]; then
  MAX_RETRIES=3
  INTERVAL=3
  TIMEOUT_SECS=$((MAX_RETRIES*INTERVAL))
  # Skip certs unless user explicitly passed --skip-certs earlier or set CERTBOT_TIMEOUT_SECS
  SKIP_CERTS=true
  CERTBOT_TIMEOUT_SECS=${CERTBOT_TIMEOUT_SECS:-30}
  log "FAST MODE enabled: retries=$MAX_RETRIES interval=$INTERVAL cert-timeout=$CERTBOT_TIMEOUT_SECS skip-certs=$SKIP_CERTS"
fi

discover_instance_id() {
  local role="$1"
  aws ec2 describe-instances \
    --region "$REGION" \
    --filters "Name=tag:Project,Values=$TAG_PROJECT" "Name=tag:$TAG_KEY_ROLE,Values=$role" "Name=instance-state-name,Values=running" \
    --query 'Reservations[].Instances[].InstanceId' --output text | awk 'NF'
}

# Lightweight TCP check without requiring nc (fallback to bash /dev/tcp)
tcp_open() {
  local host="$1" port="$2"
  timeout 3 bash -c "</dev/tcp/${host}/${port}" >/dev/null 2>&1
}

network_preflight() {
  local ip="$1"
  [[ -z "$ip" || "$ip" == "None" ]] && return 0
  if tcp_open "$ip" 22; then SSH_REACHABLE="yes"; else SSH_REACHABLE="no"; fi
  if tcp_open "$ip" 80; then HTTP_80_REACHABLE="yes"; else HTTP_80_REACHABLE="no"; fi
  log "Network preflight: ssh(22)=$SSH_REACHABLE http(80)=$HTTP_80_REACHABLE target=$ip"
  # If TCP 22 is open, attempt to distinguish banner-timeout vs. normal reachability
  if [[ "$SSH_REACHABLE" == "yes" ]]; then
    # Perform a very short SSH handshake without auth to see if server presents banner.
    # If it times out during banner exchange, we treat it as SSH unusable for this run.
    local probe_out
    if probe_out=$(ssh -o PreferredAuthentications=none -o PasswordAuthentication=no -o KbdInteractiveAuthentication=no \
        -o BatchMode=yes -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ConnectTimeout=5 \
        -p 22 ec2-user@"$ip" -T exit 0 2>&1 || true); then
      : # no-op, we only inspect output below
    fi
    if grep -qi "timed out during banner exchange" <<<"$probe_out"; then
      SSH_REACHABLE="banner-timeout"
    elif grep -qi "No supported authentication methods available" <<<"$probe_out"; then
      SSH_REACHABLE="yes"
    elif grep -qi "Connection timed out" <<<"$probe_out"; then
      SSH_REACHABLE="banner-timeout"
    fi
    if [[ "$SSH_REACHABLE" == "banner-timeout" ]]; then
      warn "SSH port accepts TCP but stalls during banner exchange – disabling CERTBOT and diagnostics for this run"
      SKIP_CERTS=true; COLLECT_DIAG=false
    fi
  elif [[ "$SSH_REACHABLE" == "no" ]]; then
    warn "SSH unreachable – auto-disabling CERTBOT and diagnostics collection for this run"
    SKIP_CERTS=true; COLLECT_DIAG=false
  fi
}

# Attempt to fix SSH hang via SSM (if allowed). No-op on access denied.
attempt_ssm_repair() {
  local instance_id="$1"
  local region="$2"
  # Try to restart sshd via SSM Run Command. Ignore failures, just log.
  local cmd_id
  set +e
  cmd_id=$(aws ssm send-command --region "$region" \
    --instance-ids "$instance_id" \
    --document-name AWS-RunShellScript \
    --comment "bb-portfolio: attempt sshd repair" \
    --parameters commands='["set -euxo pipefail","sudo systemctl restart sshd || sudo systemctl restart ssh || true","sleep 2","(ss -ltnp || sudo ss -ltnp || true) | (grep :22 || true)"]' \
    --query 'Command.CommandId' --output text 2>/dev/null)
  local rc=$?
  set -e
  if [[ $rc -ne 0 || -z "$cmd_id" || "$cmd_id" == "None" ]]; then
    warn "SSM repair attempt skipped or failed (no permission/agent/profile?)"
    return 1
  else
    log "SSM repair dispatched (CommandId=$cmd_id); waiting briefly before re-probe"
    sleep 6
    return 0
  fi
}

# Check if SSM sees the instance as Online
ssm_is_online() {
  local instance_id="$1" region="$2"
  local ping
  set +e
  ping=$(aws ssm describe-instance-information --region "$region" \
    --filters "Key=InstanceIds,Values=${instance_id}" \
    --query 'InstanceInformationList[0].PingStatus' --output text 2>/dev/null)
  local rc=$?
  set -e
  [[ $rc -eq 0 && "$ping" == "Online" ]]
}

# Reboot instance and wait for EC2 status checks to pass again
reboot_instance_and_wait() {
  local instance_id="$1" region="$2"
  log "Rebooting instance $instance_id due to SSH hang"
  aws ec2 reboot-instances --instance-ids "$instance_id" --region "$region" >/dev/null || { warn "Reboot API call failed"; return 1; }
  log "Waiting for instance status checks to pass (this can take a few minutes)"
  # Use a bounded wait loop to avoid excessive delays
  local tries=0
  while (( tries < 30 )); do
    if status_checks_pass "$instance_id"; then
      log "Instance status checks OK after reboot"
      return 0
    fi
    sleep 10; ((tries++))
  done
  warn "Instance did not pass status checks in time after reboot"
  return 1
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

# Run preflight before any SSH attempts
network_preflight "$CANDIDATE_IP"

# If SSH is unusable, optionally attempt automated remediation
if [[ "$SSH_REACHABLE" == "banner-timeout" || "$SSH_REACHABLE" == "no" ]]; then
  # Try SSM repair first (best-effort)
  attempt_ssm_repair "$CANDIDATE_ID" "$REGION" || true
  # Re-probe quickly
  network_preflight "$CANDIDATE_IP"
  # Optionally reboot if still unusable and flag is set
  if [[ ("$SSH_REACHABLE" == "banner-timeout" || "$SSH_REACHABLE" == "no") && "$REBOOT_ON_SSH_HANG" == true ]]; then
    if [[ "$AUTO_APPROVE" == true || "$DRY_RUN" == true ]]; then
      reboot_instance_and_wait "$CANDIDATE_ID" "$REGION" || true
    else
      warn "SSH hang detected; reboot-on-ssh-hang requested. Confirm reboot? (yes/no)"
      read -r ans
      if [[ "$ans" == "yes" ]]; then
        reboot_instance_and_wait "$CANDIDATE_ID" "$REGION" || true
      else
        log "Reboot cancelled by user"
      fi
    fi
    # After reboot, refresh IP (may change if not using EIP yet) and re-run preflight
    CANDIDATE_IP=$(get_public_ip "$CANDIDATE_ID")
    [[ -z "$CANDIDATE_IP" || "$CANDIDATE_IP" == "None" ]] && { err "Candidate public IP not found post-reboot."; exit 2; }
    network_preflight "$CANDIDATE_IP"
  fi
fi

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
  # Null-green mode: candidate already has its EIP (blue), just use it
  EIP_INFO=$(aws ec2 describe-addresses --region "$REGION" --filters "Name=instance-id,Values=$CANDIDATE_ID" --query 'Addresses[0]' --output json || echo '{}')
  EIP_ALLOC_ID=$(jq -r '.AllocationId // empty' <<<"$EIP_INFO")
  EIP_PUBLIC_IP=$(jq -r '.PublicIp // empty' <<<"$EIP_INFO")
  if [[ -z "$EIP_ALLOC_ID" || -z "$EIP_PUBLIC_IP" ]]; then
    warn "No EIP attached to candidate; will attach PROD_EIP ($PROD_EIP) for initial activation"
    # Look up AllocationId for the configured production EIP constant
    PROD_ADDR=$(aws ec2 describe-addresses --region "$REGION" --public-ips "$PROD_EIP" --query 'Addresses[0]' --output json || echo '{}')
    PROD_ALLOC_ID=$(jq -r '.AllocationId // empty' <<<"$PROD_ADDR")
    if [[ -z "$PROD_ALLOC_ID" ]]; then
      warn "Production EIP $PROD_EIP not found in region $REGION; continuing without EIP association"
    else
      if [[ "$DRY_RUN" == true ]]; then
        log "[dry-run] Would associate PROD_EIP $PROD_EIP (AllocationId: $PROD_ALLOC_ID) to candidate $CANDIDATE_ID"
      else
        aws ec2 associate-address --allow-reassociation --allocation-id "$PROD_ALLOC_ID" --instance-id "$CANDIDATE_ID" --region "$REGION" >/dev/null || warn "Association of PROD_EIP failed"
        EIP_ALLOC_ID="$PROD_ALLOC_ID"; EIP_PUBLIC_IP="$PROD_EIP"; CANDIDATE_IP="$PROD_EIP"
        log "Associated PROD_EIP $EIP_PUBLIC_IP to candidate"
      fi
    fi
  else
    # If candidate holds a non-prod EIP (e.g., BLUE_EIP), re-associate to PROD_EIP
    if [[ -n "${PROD_EIP:-}" && "$EIP_PUBLIC_IP" != "$PROD_EIP" ]]; then
      PROD_ADDR=$(aws ec2 describe-addresses --region "$REGION" --public-ips "$PROD_EIP" --query 'Addresses[0]' --output json || echo '{}')
      PROD_ALLOC_ID=$(jq -r '.AllocationId // empty' <<<"$PROD_ADDR")
      if [[ -n "$PROD_ALLOC_ID" ]]; then
        if [[ "$DRY_RUN" == true ]]; then
          log "[dry-run] Would re-associate PROD_EIP $PROD_EIP to candidate (replace $EIP_PUBLIC_IP)"
        else
          aws ec2 associate-address --allow-reassociation --allocation-id "$PROD_ALLOC_ID" --instance-id "$CANDIDATE_ID" --region "$REGION" >/dev/null || warn "Re-association to PROD_EIP failed"
          EIP_ALLOC_ID="$PROD_ALLOC_ID"; EIP_PUBLIC_IP="$PROD_EIP"; CANDIDATE_IP="$PROD_EIP"
          log "Re-associated candidate to PROD_EIP $EIP_PUBLIC_IP"
        fi
      else
        warn "Production EIP $PROD_EIP not found; keeping existing candidate EIP $EIP_PUBLIC_IP"
      fi
    else
      log "Candidate EIP: $EIP_PUBLIC_IP (AllocationId: $EIP_ALLOC_ID)"
    fi
  fi
fi

status_checks_pass() {
  local iid="$1"
  local st sys
  st=$(aws ec2 describe-instance-status --instance-ids "$iid" --region "$REGION" --query 'InstanceStatuses[0].InstanceStatus.Status' --output text 2>/dev/null || true)
  sys=$(aws ec2 describe-instance-status --instance-ids "$iid" --region "$REGION" --query 'InstanceStatuses[0].SystemStatus.Status' --output text 2>/dev/null || true)
  [[ "$st" == "ok" && "$sys" == "ok" ]]
}

ensure_https_certs() {
  if [[ "$SKIP_CERTS" == true ]]; then
    log "Skipping HTTPS certificates (flag: --skip-certs)."
    if [[ "$COLLECT_DIAG" == true ]]; then
      warn "Diagnostics collection also skipped because cert step did not execute. (Reason: --skip-certs)"
    fi
    return 0
  fi
  if [[ "$DRY_RUN" == true ]]; then
    log "[dry-run] Would ensure HTTPS certificates on ${EIP_PUBLIC_IP:-$CANDIDATE_IP}"; return 0
  fi

  # Verify DNS A records point to the promoted EIP before attempting issuance
  local target_ip="${EIP_PUBLIC_IP:-$CANDIDATE_IP}"
  local domains=(bbaysinger.com www.bbaysinger.com dev.bbaysinger.com)
  # Allow override of DNS wait attempts; reduce in FAST mode
  local DNS_MAX_ATTEMPTS=${DNS_MAX_ATTEMPTS:-24}
  if [[ "$FAST_MODE" == true && -z "${DNS_MAX_ATTEMPTS_OVERRIDE_SET:-}" ]]; then
    DNS_MAX_ATTEMPTS=6
  fi
  local dns_ok=false
  log "DNS gating: waiting for at least 1 domain A record to point to $target_ip (attempts=$DNS_MAX_ATTEMPTS interval=5s)"
  for i in $(seq 1 "$DNS_MAX_ATTEMPTS"); do
    local matched=0
    local details=""
    for d in "${domains[@]}"; do
      ip_list=$(dig +short A "$d" | tr '\n' ' ' | sed 's/ *$//')
      [[ -n "$ip_list" ]] && details+="$d=[${ip_list}] " || details+="$d=[none] "
      if grep -q "$target_ip" <<<"$ip_list"; then ((matched++)); fi
    done
    log "[dns-gate] attempt=$i matched=$matched details: $details"
    if (( matched >= 1 )); then dns_ok=true; break; fi
    sleep 5
  done
  if [[ "$dns_ok" != true ]]; then
    warn "DNS does not yet resolve to $target_ip; skipping cert issuance to avoid hang"; return 0
  fi

  # Prefer SSM for cert issuance if available or forced; fall back to SSH
  ACME_EMAIL="${ACME_EMAIL:-bhbaysinger@gmail.com}"
  if [[ "$FORCE_SSM_CERTS" == true || $(ssm_is_online "$CANDIDATE_ID" "$REGION" && echo online || echo offline) == online ]]; then
    log "Ensuring HTTPS certificates via SSM (preferred path)"
    # Build the inline script for SSM
    local ssm_script
    ssm_script=$(cat <<'EOS'
set -euo pipefail
if ! command -v nginx >/dev/null 2>&1; then
  echo "Nginx not detected; skipping certbot nginx flow"; exit 0
fi
if ! command -v certbot >/dev/null 2>&1; then
  echo "Installing certbot..."
  sudo yum install -y certbot python3-certbot-nginx || true
fi
if command -v certbot >/dev/null 2>&1; then
  if [ ! -d /etc/letsencrypt/live/bbaysinger.com ]; then
    echo "Issuing certificates via certbot (timeout '${CERTBOT_TIMEOUT_SECS:-180}'s)"
    timeout ${CERTBOT_TIMEOUT_SECS:-180}s sudo certbot --nginx -n --agree-tos --email __ACME_EMAIL__ \
      -d bbaysinger.com -d www.bbaysinger.com -d dev.bbaysinger.com --redirect || echo "WARN: certbot issue timed out/failed"
    sudo systemctl reload nginx || true
  else
    echo "Certificates present; attempting renewal (timeout '${CERTBOT_TIMEOUT_SECS:-180}'s)"
    timeout ${CERTBOT_TIMEOUT_SECS:-180}s sudo certbot renew --quiet || echo "WARN: certbot renew failed/timed out"
    sudo systemctl reload nginx || true
  fi
  # Ensure renew timer is enabled
  sudo systemctl enable --now certbot-renew.timer || true
  systemctl is-active certbot-renew.timer || true
fi
EOS
)
    # Inject email value safely
    ssm_script=${ssm_script/__ACME_EMAIL__/$ACME_EMAIL}
    # Base64-encode the script to avoid JSON/quoting issues
    local ssm_b64
    ssm_b64=$(printf "%s" "$ssm_script" | base64 | tr -d '\n')
    # Send the SSM command (decode and execute remotely)
    local cmd_id status
    cmd_id=$(aws ssm send-command --region "$REGION" \
      --instance-ids "$CANDIDATE_ID" \
      --document-name AWS-RunShellScript \
      --comment "bb-portfolio: ensure https certs via ssm" \
      --parameters commands=["bash","-lc","echo '$ssm_b64' | base64 -d | bash"] \
      --query 'Command.CommandId' --output text 2>/dev/null || echo "")
    if [[ -n "$cmd_id" && "$cmd_id" != "None" ]]; then
      # Poll briefly for completion (best-effort)
      for _ in $(seq 1 30); do
        status=$(aws ssm get-command-invocation --region "$REGION" --command-id "$cmd_id" --instance-id "$CANDIDATE_ID" --query 'Status' --output text 2>/dev/null || echo "")
        [[ "$status" == "Success" ]] && break
        [[ "$status" == "TimedOut" || "$status" == "Failed" || "$status" == "Cancelled" ]] && break
        sleep 2
      done
      log "SSM cert step status: ${status:-unknown} (CommandId=$cmd_id)"
    else
      warn "SSM send-command failed; falling back to SSH"
    fi
  fi

  # If SSM path didn't run or not online, use SSH fallback
  if [[ "$FORCE_SSM_CERTS" != true && ! $(ssm_is_online "$CANDIDATE_ID" "$REGION" && echo online || echo offline) == online ]]; then
    # If using Caddy, skip: Caddy handles ACME automatically
    if ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ConnectTimeout=5 "ec2-user@${target_ip}" command -v caddy >/dev/null 2>&1; then
      log "Caddy detected on instance; skipping certbot (Caddy manages TLS)."
      if [[ "$COLLECT_DIAG" == true ]]; then
        warn "Diagnostics collection limited: certbot-specific logs will not be generated when Caddy manages TLS."
      fi
    else
      local SSH_KEY="$HOME/.ssh/bb-portfolio-site-key.pem"
      if [[ ! -f "$SSH_KEY" ]]; then
        warn "SSH key not found at $SSH_KEY; skipping SSH-based certificate setup"
      else
        ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ConnectTimeout=5 "ec2-user@$target_ip" bash -lc $'set -e
          if ! command -v nginx >/dev/null 2>&1; then
            echo "Nginx not detected; skipping certbot nginx flow"; exit 0
          fi
          if ! command -v certbot >/dev/null 2>&1; then
            echo "Installing certbot...";
            sudo yum install -y certbot python3-certbot-nginx || true
          fi
          STREAM_CERTBOT_REMOTE="'"$STREAM_CERTBOT"'"
          if command -v certbot >/dev/null 2>&1; then
            if [ ! -d /etc/letsencrypt/live/bbaysinger.com ]; then
              echo "Issuing certificates via certbot (timeout '\''${CERTBOT_TIMEOUT_SECS:-180}'\''s)";
              if [ "$STREAM_CERTBOT_REMOTE" = true ]; then
                echo "[live-stream] tailing /var/log/letsencrypt/letsencrypt.log during issuance";
                sudo mkdir -p /var/log/letsencrypt || true
                sudo touch /var/log/letsencrypt/letsencrypt.log || true
                sudo tail -n 25 -f /var/log/letsencrypt/letsencrypt.log & LIVE_TAIL_PID=$!
              fi
              if timeout ${CERTBOT_TIMEOUT_SECS:-180}s sudo certbot --nginx -n --agree-tos --email '"$ACME_EMAIL"' \
                -d bbaysinger.com -d www.bbaysinger.com -d dev.bbaysinger.com --redirect; then
                echo "Certificates issued successfully";
                sudo systemctl reload nginx || true
              else
                echo "WARNING: Certbot issuance timed out/failed (will not block promotion)";
              fi
              if [ "$STREAM_CERTBOT_REMOTE" = true ] && [ -n "${LIVE_TAIL_PID:-}" ]; then
                sudo kill "$LIVE_TAIL_PID" 2>/dev/null || true
                echo "[live-stream] issuance complete (tail terminated)"
              fi
            else
              echo "Certificates present; attempting renewal (timeout '\''${CERTBOT_TIMEOUT_SECS:-180}'\''s)";
              if [ "$STREAM_CERTBOT_REMOTE" = true ]; then
                echo "[live-stream] tailing /var/log/letsencrypt/letsencrypt.log during renewal";
                sudo mkdir -p /var/log/letsencrypt || true
                sudo touch /var/log/letsencrypt/letsencrypt.log || true
                sudo tail -n 25 -f /var/log/letsencrypt/letsencrypt.log & LIVE_TAIL_PID=$!
              fi
              timeout ${CERTBOT_TIMEOUT_SECS:-180}s sudo certbot renew --quiet || echo "Renewal failed or timed out"
              if [ "$STREAM_CERTBOT_REMOTE" = true ] && [ -n "${LIVE_TAIL_PID:-}" ]; then
                sudo kill "$LIVE_TAIL_PID" 2>/dev/null || true
                echo "[live-stream] renewal complete (tail terminated)"
              fi
            fi
            # Ensure renew timer is enabled in SSH path as well
            sudo systemctl enable --now certbot-renew.timer || true
          else
            echo "WARNING: certbot not available after install attempt";
          fi' || warn "HTTPS certificate step via SSH completed with warnings (see remote logs)"
      fi
    fi
  fi

  # Always collect diagnostics after cert step (best-effort)
  if [[ "$COLLECT_DIAG" == true ]]; then
    collect_certbot_diagnostics "$target_ip" "post-cert-step" 2>/dev/null || warn "Diagnostics collection failed (post-cert-step)"
  else
    log "Diagnostics collection disabled (COLLECT_DIAG=false)."
  fi
}

http_ok() {
  local url="$1" code
  code=$(curl -s -o /dev/null -w '%{http_code}' --connect-timeout 3 --max-time 20 "$url" || echo "000")
  # Accept any 2xx or 3xx status (allow redirects)
  [[ "$code" =~ ^2[0-9][0-9]$ || "$code" =~ ^3[0-9][0-9]$ ]]
}

health_probe_candidate() {
  local attempt=1
  # Prefer production EIP if available (null-green re-association)
  local probe_ip="${EIP_PUBLIC_IP:-$CANDIDATE_IP}"
  local token=$(curl -s -X PUT --connect-timeout 1 --max-time 2 "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 21600" 2>/dev/null || echo "")
  local current_ip=""
  if [[ -n "$token" ]]; then
    current_ip=$(curl -s -H "X-aws-ec2-metadata-token: $token" --connect-timeout 1 --max-time 2 http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo "")
  fi
  if [[ -n "$current_ip" && "$current_ip" == "$CANDIDATE_IP" ]]; then
    probe_ip="localhost"
  fi
  # Bypass logic: flag or DemotedForTest tag
  local demote_tag="$(aws ec2 describe-instances --region "$REGION" --instance-ids "$CANDIDATE_ID" --query 'Reservations[0].Instances[0].Tags[?Key==`DemotedForTest`].Value|[0]' --output text 2>/dev/null || true)"
  if [[ "$ASSUME_HEALTHY" == true || -n "$demote_tag" ]]; then
    log "Bypassing candidate health (ASSUME_HEALTHY=$ASSUME_HEALTHY DemotedForTest='${demote_tag:-}')"
    return 0
  fi
  while (( attempt <= MAX_RETRIES )); do
    # Accept either proxy (80) OK or both app ports OK as healthy
    local st_ok="no" http_pattern="no"
    if status_checks_pass "$CANDIDATE_ID"; then st_ok="yes"; fi
    if { http_ok "http://${probe_ip}/" || ( http_ok "http://${probe_ip}:3000/" && http_ok "http://${probe_ip}:3001/api/health/" ); }; then http_pattern="yes"; fi
    log "[health][candidate] attempt=$attempt st_ok=$st_ok http_pattern=$http_pattern"
    if [[ "$st_ok" == yes && "$http_pattern" == yes ]]; then return 0; fi
    sleep "$INTERVAL"; ((attempt++))
  done
  return 1
}

health_probe_active_post_swap() {
  local attempt=1
  while (( attempt <= MAX_RETRIES )); do
    # Prefer the production EIP, but fall back to candidate IP if not set
    local target_ip="${EIP_PUBLIC_IP:-}"
    if [[ -z "$target_ip" || "$target_ip" == "None" ]]; then
      target_ip="$CANDIDATE_IP"
    fi
    if status_checks_pass "$CANDIDATE_ID"; then
      if [[ "$POST_SWAP_LOCAL" == true ]]; then
        local SSH_KEY_DEFAULT="$HOME/.ssh/bb-portfolio-site-key.pem"
        local SSH_ARGS=()
        [[ -f "$SSH_KEY_DEFAULT" ]] && SSH_ARGS+=("-i" "$SSH_KEY_DEFAULT")
        local SSH_OPTS=("-o" "StrictHostKeyChecking=no" "-o" "UserKnownHostsFile=/dev/null" "-o" "ConnectTimeout=5")
        local local_ok="no"
        if ssh "${SSH_ARGS[@]}" "${SSH_OPTS[@]}" "ec2-user@${target_ip}" bash -lc 'set -e; \
          c1=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ || echo 000); \
          c2=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/health/ || echo 000); \
          [[ $c1 =~ ^2[0-9][0-9]$ || $c1 =~ ^3[0-9][0-9]$ ]] && [[ $c2 =~ ^2[0-9][0-9]$ || $c2 =~ ^3[0-9][0-9]$ ]]'; then local_ok="yes"; fi
        log "[health][post-swap-local] attempt=$attempt local_ok=$local_ok"
        if [[ "$local_ok" == yes ]]; then return 0; fi
      else
        # External mode: accept port 80 root OR both app ports success
        local ext_ok="no"
        if { http_ok "http://$target_ip/" || ( http_ok "http://$target_ip:3000/" && http_ok "http://$target_ip:3001/api/health/" ); }; then ext_ok="yes"; fi
        log "[health][post-swap-ext] attempt=$attempt ext_ok=$ext_ok"
        if [[ "$ext_ok" == yes ]]; then return 0; fi
      fi
    fi
    sleep "$INTERVAL"; ((attempt++))
  done
  return 1
}

log "Pre-swap candidate health check (timeout ${TIMEOUT_SECS}s)"
health_probe_candidate || { [[ "$COLLECT_DIAG" == true ]] && collect_certbot_diagnostics "${EIP_PUBLIC_IP:-$CANDIDATE_IP}" "pre-swap-health-failed"; err "Candidate failed health checks."; exit 3; }
log "Candidate passes pre-swap health checks."

if [[ "$PROMOTE" != true ]]; then
  log "--health-only specified; exiting after successful health verification."; exit 0
fi

if [[ "$NULL_GREEN_MODE" == true ]]; then
  # Null-green mode: attach production green EIP, swap SGs, tag as active
  get_active_sg() {
    # Primary: tagged SG
    local sg
    sg=$(aws ec2 describe-security-groups --region "$REGION" --filters "Name=tag:Name,Values=bb-portfolio-sg" --query 'SecurityGroups[0].GroupId' --output text 2>/dev/null || echo "")
    [[ "$sg" == "None" ]] && sg=""
    echo "$sg"
  }
  CANDIDATE_CURRENT_SG=$(aws ec2 describe-instances --instance-ids "$CANDIDATE_ID" --region "$REGION" --query 'Reservations[0].Instances[0].SecurityGroups[0].GroupId' --output text 2>/dev/null || echo "")
  [[ "$CANDIDATE_CURRENT_SG" == "None" ]] && CANDIDATE_CURRENT_SG=""
  PROD_SG=$(get_active_sg)
  if [[ -z "$PROD_SG" ]]; then
    warn "Production SG (tag Name=bb-portfolio-sg) not found; retaining existing candidate SG ($CANDIDATE_CURRENT_SG)"
  elif [[ "$PROD_SG" == "$CANDIDATE_CURRENT_SG" ]]; then
    log "Candidate already using production SG ($PROD_SG); no SG change needed"
  fi
  
  if [[ "$AUTO_APPROVE" != true && "$DRY_RUN" != true ]]; then
    log "Ready to activate candidate $CANDIDATE_ID (current EIP: $EIP_PUBLIC_IP)"
    printf "Type 'yes' to confirm: "; read -r response; [[ "$response" == yes ]] || { log "Activation cancelled"; exit 0; }
  fi
  
  if [[ "$DRY_RUN" == true ]]; then
    [[ -n "$EIP_ALLOC_ID" ]] && log "[dry-run] EIP $EIP_ALLOC_ID ($EIP_PUBLIC_IP) attached to $CANDIDATE_ID or would be associated"
    log "[dry-run] Would update SG to $PROD_SG"
    log "[dry-run] Would tag $CANDIDATE_ID Role=active (null-green initial activation)"
  else
    # EIP attachment/re-association handled above; proceed with SG and tags
    if [[ -n "$PROD_SG" && "$PROD_SG" != "$CANDIDATE_CURRENT_SG" ]]; then
      log "Updating security group to production ($PROD_SG)"
      aws ec2 modify-instance-attribute --instance-id "$CANDIDATE_ID" --region "$REGION" --groups "$PROD_SG" >/dev/null || warn "SG update failed"
    fi

    aws ec2 create-tags --resources "$CANDIDATE_ID" --region "$REGION" --tags Key=$TAG_KEY_ROLE,Value=active Key=PromotionTimestamp,Value=$TIMESTAMP >/dev/null || warn "Failed to tag candidate as active"

    log "Post-activation health verification (timeout ${TIMEOUT_SECS}s)"
    if ! health_probe_active_post_swap; then
      [[ "$COLLECT_DIAG" == true ]] && collect_certbot_diagnostics "${EIP_PUBLIC_IP:-$CANDIDATE_IP}" "null-green-post-activation-failed"
      err "Post-activation health failed at ${EIP_PUBLIC_IP:-$CANDIDATE_IP}"
      exit 4
    fi
  fi
  
  # Install SSL certificates after activation (EIP is now correct)
  ensure_https_certs
  
  log "Null-green activation complete: candidate now active at EIP $EIP_PUBLIC_IP"
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
  [[ "$COLLECT_DIAG" == true ]] && collect_certbot_diagnostics "${EIP_PUBLIC_IP:-$CANDIDATE_IP}" "post-swap-health-failed"
  err "Post-swap health failed"
  if [[ "$ROLLBACK_ON_FAIL" == true ]]; then
    warn "Attempting rollback..."; rollback_swap; exit 4
  else
    warn "Rollback disabled; manual intervention required"; exit 4
  fi
fi

# Install SSL certificates after EIP swap (safe, non-blocking)
ensure_https_certs

log "Promotion successful: candidate now active at Elastic IP ${EIP_PUBLIC_IP:-$CANDIDATE_IP}"
ELAPSED=$(( $(date +%s) - SCRIPT_START_EPOCH ))
log "Total elapsed seconds: $ELAPSED"
exit 0
