#!/usr/bin/env bash
set -euo pipefail

# apply-sshd-hardening.sh
# Idempotently apply SSH hardening settings and restart sshd safely.
# Usage: sudo ./apply-sshd-hardening.sh

CONF="/etc/ssh/sshd_config"
BACKUP="/etc/ssh/sshd_config.backup.$(date +%Y%m%d%H%M%S)"

echo "[+] Backing up current sshd_config to ${BACKUP}"
cp -p "$CONF" "$BACKUP"

# Ensure required directives exist / are updated.
replace_or_append() {
  local key="$1" value="$2"
  if grep -qi "^${key}" "$CONF"; then
    sed -i "s/^${key}.*/${key} ${value}/I" "$CONF"
  else
    echo "${key} ${value}" >> "$CONF"
  fi
}

replace_or_append PasswordAuthentication no
replace_or_append PermitRootLogin no
replace_or_append AllowUsers ec2-user
replace_or_append MaxAuthTries 3
replace_or_append MaxStartups "10:30:100"
replace_or_append LoginGraceTime 20s
replace_or_append ClientAliveInterval 300
replace_or_append ClientAliveCountMax 2

# Tighten host key algorithms (optional; uncomment to enforce modern set)
# replace_or_append HostKeyAlgorithms "ssh-ed25519,ecdsa-sha2-nistp256"
# replace_or_append PubkeyAcceptedAlgorithms "ssh-ed25519,ecdsa-sha2-nistp256"

# Test configuration before restarting
if sshd -t; then
  echo "[+] sshd config test passed; reloading service"
  systemctl reload sshd || systemctl restart sshd
  echo "[+] Hardening applied successfully"
else
  echo "[!] sshd config test failed; restoring backup" >&2
  cp "$BACKUP" "$CONF"
  exit 1
fi

# Show active settings for verification
echo "[+] Active sshd settings (filtered):"
egrep -i '^(passwordauthentication|maxauthtries|maxstartups|login|permitrootlogin|allowusers|clientaliveinterval|clientalivecountmax)' "$CONF"
