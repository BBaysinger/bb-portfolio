#!/usr/bin/env bash
# Sync secrets.json into GitHub repo secrets (destructive: removes extras)
#
# Usage:
#   ./sync-github-secrets.sh <owner/repo> <secrets.json> [--dry-run]
#
# Examples:
#   ./sync-github-secrets.sh BBaysinger/bb-portfolio github-secrets.json5 --dry-run
#   ./sync-github-secrets.sh BBaysinger/bb-portfolio github-secrets.json5
#
# Example github-secrets.json5 file (values intentionally left blank):
# --------------------------------------------------------------------
# // GitHub Actions secrets reference for CI/CD
# // DO NOT COMMIT REAL VALUES
# // Use sync-github-secrets.sh to sync to migrate these values to GitHub repository secrets automatically.
# // Update this file as needed, then run the script to sync secrets with GitHub.
# {
#   // AWS IAM user credentials (AWS Console > IAM > Users > User for this deployment)
#   "AWS_ACCESS_KEY_ID": "",
#   "AWS_SECRET_ACCESS_KEY": "",
#   // MongoDB Atlas connection string for dev database
#   "DEV_MONGODB_URI": "",
#   // Payload CMS secret
#   "DEV_PAYLOAD_SECRET": "",
#   // Docker Hub account credentials
#   "DOCKER_HUB_ACCESS_TOKEN": "",
#   "DOCKER_HUB_USERNAME": "",
#   // Public IP or DNS of your EC2 instance
#   "EC2_HOST": "",
#   // Private SSH key for EC2 access (must be single-line with \n escapes)
#   "EC2_SSH_KEY": "",
#   // MongoDB Atlas connection string for prod database
#   "PROD_MONGODB_URI": "",
#   // Payload CMS secret
#   "PROD_PAYLOAD_SECRET": ""
# }

set -euo pipefail

if [ "$#" -lt 2 ] || [ "$#" -gt 3 ]; then
  echo "Usage: $0 <owner/repo> <secrets.json> [--dry-run]"
  exit 1
fi

REPO=$1
JSON_FILE=$2
DRY_RUN=${3:-}

# If the input file is .json5, convert to .json using Node.js and json5 package
if [[ "$JSON_FILE" == *.json5 ]]; then
  if ! command -v node &>/dev/null; then
    echo "Error: Node.js is required to parse JSON5 files."
    exit 1
  fi
  if ! node -e "require('json5')" &>/dev/null; then
    echo "Error: The 'json5' npm package is required. Install with: npm install -g json5"
    exit 1
  fi
  TMP_JSON="${JSON_FILE%.json5}.json"
  node -e "const fs=require('fs');const JSON5=require('json5');fs.writeFileSync('$TMP_JSON', JSON.stringify(JSON5.parse(fs.readFileSync('$JSON_FILE','utf8'))))"
  JSON_FILE="$TMP_JSON"
fi

if ! command -v jq &>/dev/null; then
  echo "Error: jq is required but not installed."
  exit 1
fi

if ! command -v gh &>/dev/null; then
  echo "Error: GitHub CLI (gh) is required but not installed."
  exit 1
fi

if [ ! -f "$JSON_FILE" ]; then
  echo "Error: File $JSON_FILE not found."
  exit 1
fi

echo "📥 Reading secrets from $JSON_FILE ..."
DESIRED_KEYS=$(jq -r 'keys[]' "$JSON_FILE")

# 1. Get current secrets from repo
CURRENT_KEYS=$(gh secret list --repo "$REPO" --json name -q '.[].name')

# 2. Remove any secrets not in JSON
for key in $CURRENT_KEYS; do
  if ! grep -qx "$key" <(echo "$DESIRED_KEYS"); then
    if [ "$DRY_RUN" = "--dry-run" ]; then
      echo "🗑 (dry run) Would remove old secret: $key"
    else
      echo "🗑 Removing old secret: $key"
      gh secret delete "$key" --repo "$REPO"
    fi
  fi
done

# 3. Set/update secrets from JSON (robust for multi-line and special chars)
jq -r 'to_entries[] | [.key, .value] | @tsv' "$JSON_FILE" | \
while IFS=$'\t' read -r key value; do
  if [ "$DRY_RUN" = "--dry-run" ]; then
    echo "🔑 (dry run) Would set $key (length: ${#value})"
  else
    echo "🔑 Setting $key ..."
    printf "%s" "$value" | gh secret set "$key" --repo "$REPO" -b-
  fi
done

if [ "$DRY_RUN" = "--dry-run" ]; then
  echo "✅ Dry run complete! No secrets were changed."
else
  echo "✅ Sync complete! Repo $REPO now matches $JSON_FILE exactly."
fi
