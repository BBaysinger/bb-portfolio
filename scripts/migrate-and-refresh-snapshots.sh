#!/usr/bin/env bash

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

SOURCE_ENV="local"
TARGET_ENV=""
EXPLICIT_CONFIRM=false

usage() {
  cat >&2 <<'EOF'
Usage: scripts/migrate-and-refresh-snapshots.sh --target dev|prod [--source local|dev|prod] [--confirm-prod-write]

Runs the aggregate content migration, then regenerates both frontend snapshot
secret payloads from the target environment and syncs only the relevant GitHub
environment secrets.

Examples:
  bash scripts/migrate-and-refresh-snapshots.sh --target dev
  bash scripts/migrate-and-refresh-snapshots.sh --target prod --confirm-prod-write

Overrides:
  TARGET_BACKEND_BASE  Explicit reachable base URL for snapshot generation.
                       Example: https://dev.bbaysinger.io
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --source)
      SOURCE_ENV="${2:-}"
      shift 2
      ;;
    --target)
      TARGET_ENV="${2:-}"
      shift 2
      ;;
    --confirm-prod-write)
      EXPLICIT_CONFIRM=true
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage
      exit 1
      ;;
  esac
done

[[ "$SOURCE_ENV" =~ ^(local|dev|prod)$ ]] || {
  echo "--source must be one of: local, dev, prod" >&2
  exit 1
}

[[ "$TARGET_ENV" =~ ^(dev|prod)$ ]] || {
  echo "--target must be one of: dev, prod" >&2
  exit 1
}

resolve_target_backend_base() {
  if [[ -n "${TARGET_BACKEND_BASE:-}" ]]; then
    printf '%s\n' "${TARGET_BACKEND_BASE%/}"
    return 0
  fi

  TARGET_ENV_NAME="$TARGET_ENV" REPO_ROOT_PATH="$REPO_ROOT" node <<'NODE'
const fs = require('node:fs');
const path = require('node:path');
const JSON5 = require('json5');

const repoRoot = process.env.REPO_ROOT_PATH;
const target = process.env.TARGET_ENV_NAME;
const files = [
  path.join(repoRoot, `.github-secrets.private.${target}.json5`),
  path.join(repoRoot, '.github-secrets.private.json5'),
];

for (const filePath of files) {
  if (!fs.existsSync(filePath)) continue;
  try {
    const parsed = JSON5.parse(fs.readFileSync(filePath, 'utf8'));
    const strings = parsed?.strings ?? {};
    const raw = String(strings.PUBLIC_SERVER_URL || strings.FRONTEND_URL || '').trim();
    if (!raw) continue;
    const candidate = raw.split(',').map((value) => value.trim()).find((value) => /^https?:\/\//i.test(value));
    if (candidate) {
      process.stdout.write(candidate.replace(/\/$/, ''));
      process.exit(0);
    }
  } catch {
    // Try the next candidate file.
  }
}

process.exit(1);
NODE
}

sync_target_secrets() {
  case "$TARGET_ENV" in
    dev)
      (cd "$REPO_ROOT" && npm run sync:secrets -- --omit-env prod --omit-env stage)
      ;;
    prod)
      (cd "$REPO_ROOT" && npm run sync:secrets -- --omit-env dev --omit-env stage)
      ;;
  esac
}

run_migration() {
  local -a migrate_args=(--source "$SOURCE_ENV" --target "$TARGET_ENV")
  if [[ "$TARGET_ENV" == "prod" && "$EXPLICIT_CONFIRM" == "true" ]]; then
    migrate_args+=(--confirm-prod-write)
  fi

  if [[ "$TARGET_ENV" == "dev" ]]; then
    (cd "$REPO_ROOT" && ALLOW_DEV_WRITE=true bash ./scripts/content-workflow.sh migrate "${migrate_args[@]}")
    return
  fi

  (cd "$REPO_ROOT" && ALLOW_PROD_WRITE=true bash ./scripts/content-workflow.sh migrate "${migrate_args[@]}")
}

TARGET_BASE="$(resolve_target_backend_base)" || {
  echo "Unable to resolve a reachable backend base for $TARGET_ENV. Set TARGET_BACKEND_BASE explicitly." >&2
  exit 1
}

run_migration

(
  cd "$REPO_ROOT"
  export ENV_PROFILE="$TARGET_ENV"
  export BACKEND_INTERNAL_URL="$TARGET_BASE"
  npm run snapshot:projects:secret:refresh
  npm run snapshot:static-content:secret:refresh
  sync_target_secrets
)

echo "[migrate-and-refresh-snapshots] Completed local migration + snapshot refresh for $TARGET_ENV using $TARGET_BASE"