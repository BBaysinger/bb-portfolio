#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

source "$REPO_ROOT/scripts/lib/repo-env.sh"
bb_load_repo_env "$REPO_ROOT"

KEY_PATH="${1:?ssh key path arg required}" 
OUT_DIR="${OUT_DIR:?OUT_DIR env required}"
EC2_HOST="$(bb_ec2_host_or_die)"
SSH_OPTS=${SSH_OPTS:-"-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ConnectTimeout=10 -o ServerAliveInterval=5 -o ServerAliveCountMax=2 -o PreferredAuthentications=publickey -o PubkeyAuthentication=yes -o TCPKeepAlive=yes -o Compression=yes"}

[ -d "$OUT_DIR" ] || { echo "OUT_DIR not a directory: $OUT_DIR" >&2; exit 1; }

echo "== Packaging env files for single transfer =="
BUNDLE_PATH="$OUT_DIR/env-bundle.tgz"

# Collect whichever env files exist (dev-only runs won't have prod files, etc.).
pushd "$OUT_DIR" >/dev/null
shopt -s nullglob
bundle_files=(backend.env.* frontend.env.*)
shopt -u nullglob
popd >/dev/null

if [ ${#bundle_files[@]} -eq 0 ]; then
  echo "No env files found in $OUT_DIR" >&2
  exit 1
fi

tar -C "$OUT_DIR" -czf "$BUNDLE_PATH" "${bundle_files[@]}"
echo "Bundle path: $BUNDLE_PATH"
echo "Bundle size: $(du -h "$BUNDLE_PATH" | cut -f1)"

echo "== Ensuring remote directories =="
ssh -i "$KEY_PATH" $SSH_OPTS ec2-user@"$EC2_HOST" "sudo mkdir -p /home/ec2-user/bb-portfolio/{backend,frontend} && sudo chown -R ec2-user:ec2-user /home/ec2-user/bb-portfolio"

upload_attempts=0
until scp -i "$KEY_PATH" $SSH_OPTS "$BUNDLE_PATH" ec2-user@"$EC2_HOST":/home/ec2-user/bb-portfolio/env-bundle.tgz; do
  upload_attempts=$((upload_attempts+1))
  if [ $upload_attempts -ge 3 ]; then
    echo "Env bundle upload failed after $upload_attempts attempts" >&2
    exit 1
  fi
  echo "Upload attempt $upload_attempts failed; retrying in 4s..." >&2
  sleep 4
done

echo "== Remote extract =="
ssh -i "$KEY_PATH" $SSH_OPTS ec2-user@"$EC2_HOST" $'set -e
  cd /home/ec2-user/bb-portfolio
  echo "Remote dir contents before extract:" && ls -l
  [ -f env-bundle.tgz ] || { echo "env-bundle.tgz not found in /home/ec2-user/bb-portfolio" >&2; exit 1; }
  tar -xzf env-bundle.tgz || { echo "Failed to extract env bundle" >&2; exit 1; }

  move_env() {
    local target="$1"
    for src in ${target}.env.*; do
      [ -e "$src" ] || continue
      local suffix="${src##*.}"
      local dest="${target}/.env.${suffix}"
      mv -f "$src" "$dest"
      echo "Placed $dest"
    done
  }

  move_env backend
  move_env frontend
  rm -f env-bundle.tgz
  echo "Env files deployed:"; ls -l backend/.env.* frontend/.env.*
'

echo "== Env upload complete =="
