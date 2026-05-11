#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

source "$REPO_ROOT/scripts/lib/repo-env.sh"
bb_load_repo_env "$REPO_ROOT"

KEY_PATH="${1:?ssh key path arg required}"
OUT_DIR="${OUT_DIR:?OUT_DIR env required}"
SSH_TARGET="$(bb_ec2_ssh_target_or_die)"
declare -a SSH_OPTS_ARR
read -r -a SSH_OPTS_ARR <<<"$(bb_ssh_opts_string)"

[ -d "$OUT_DIR" ] || {
  echo "OUT_DIR not a directory: $OUT_DIR" >&2
  exit 1
}

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
bb_retry 3 4 "ensure remote directories" \
  ssh -i "$KEY_PATH" "${SSH_OPTS_ARR[@]}" "$SSH_TARGET" \
  "sudo mkdir -p /home/ec2-user/bb-portfolio/{backend,frontend} && sudo chown -R ec2-user:ec2-user /home/ec2-user/bb-portfolio"

bb_retry 3 4 "env bundle upload" \
  scp -i "$KEY_PATH" "${SSH_OPTS_ARR[@]}" "$BUNDLE_PATH" "$SSH_TARGET":/home/ec2-user/bb-portfolio/env-bundle.tgz

echo "== Remote extract =="
bb_retry 3 4 "remote env extract" \
  ssh -i "$KEY_PATH" "${SSH_OPTS_ARR[@]}" "$SSH_TARGET" $'set -e
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
