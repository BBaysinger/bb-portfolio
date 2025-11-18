#!/usr/bin/env bash
set -euo pipefail
KEY_PATH="${1:?ssh key path arg required}" 
OUT_DIR="${OUT_DIR:?OUT_DIR env required}"
EC2_HOST="${EC2_HOST:?EC2_HOST env required}"
SSH_OPTS=${SSH_OPTS:-"-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ConnectTimeout=10 -o ServerAliveInterval=5 -o ServerAliveCountMax=2 -o PreferredAuthentications=publickey -o PubkeyAuthentication=yes -o TCPKeepAlive=yes -o Compression=yes"}

[ -d "$OUT_DIR" ] || { echo "OUT_DIR not a directory: $OUT_DIR" >&2; exit 1; }

echo "== Packaging env files for single transfer =="
tar -C "$OUT_DIR" -czf env-bundle.tgz backend.env.prod backend.env.dev frontend.env.prod frontend.env.dev
echo "Bundle size: $(du -h env-bundle.tgz | cut -f1)"

echo "== Ensuring remote directories =="
ssh -i "$KEY_PATH" $SSH_OPTS ec2-user@"$EC2_HOST" "sudo mkdir -p /home/ec2-user/bb-portfolio/{backend,frontend} && sudo chown -R ec2-user:ec2-user /home/ec2-user/bb-portfolio"

upload_attempts=0
until scp -i "$KEY_PATH" $SSH_OPTS env-bundle.tgz ec2-user@"$EC2_HOST":/home/ec2-user/bb-portfolio/env-bundle.tgz; do
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
  tar -xzf env-bundle.tgz || { echo "Failed to extract env bundle" >&2; exit 1; }
  mv -f backend.env.prod backend/.env.prod
  mv -f backend.env.dev backend/.env.dev
  mv -f frontend.env.prod frontend/.env.prod
  mv -f frontend.env.dev frontend/.env.dev
  rm -f env-bundle.tgz
  echo "Env files deployed:"; ls -l backend/.env.* frontend/.env.*
'

echo "== Env upload complete =="
