#!/usr/bin/env bash

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

usage() {
  cat >&2 <<'EOF'
Usage: scripts/content-workflow.sh <command>

Commands:
  import-local    Seed media and import project descriptions + CV into local
  import-dev      Import project descriptions + CV into dev (requires ALLOW_DEV_WRITE=true)
  pull-prod       Pull prod media + export authored content into configured content root
  pull-prod-dry   Dry-run variant of pull-prod
EOF
}

run_with_content_dir() {
  bash "$REPO_ROOT/scripts/with-portfolio-content-dir.sh" "$@"
}

run_import_local() {
  run_with_content_dir sh -c 'npm run media:seed && cd backend && npm run import:project-descriptions:local && npm run import:cv-content:local'
}

run_import_dev() {
  run_with_content_dir sh -c 'test "${ALLOW_DEV_WRITE:-}" = "true" || { echo "Set ALLOW_DEV_WRITE=true to import into dev." >&2; exit 1; }; cd backend && USE_GITHUB_SECRETS=true npm run import:project-descriptions -- --env dev && USE_GITHUB_SECRETS=true npm run import:cv-content -- --env dev'
}

run_pull_prod() {
  run_with_content_dir sh -c 'npm run media:pull:prod:cv-experience-logos -- --seedings-dir "$PORTFOLIO_CONTENT_DIR" && npm run media:pull:prod:project-brand-logos -- --seedings-dir "$PORTFOLIO_CONTENT_DIR" && cd backend && USE_GITHUB_SECRETS=true npm run export:project-descriptions -- --env prod && USE_GITHUB_SECRETS=true npm run export:cv-content -- --env prod'
}

run_pull_prod_dry() {
  run_with_content_dir sh -c 'npm run media:pull:prod:cv-experience-logos:dry -- --seedings-dir "$PORTFOLIO_CONTENT_DIR" && npm run media:pull:prod:project-brand-logos:dry -- --seedings-dir "$PORTFOLIO_CONTENT_DIR" && cd backend && USE_GITHUB_SECRETS=true npm run export:project-descriptions -- --env prod --dry-run && USE_GITHUB_SECRETS=true npm run export:cv-content -- --env prod --dry-run'
}

COMMAND="${1:-}"

case "$COMMAND" in
  import-local)
    run_import_local
    ;;
  import-dev)
    run_import_dev
    ;;
  pull-prod)
    run_pull_prod
    ;;
  pull-prod-dry)
    run_pull_prod_dry
    ;;
  "" | -h | --help | help)
    usage
    exit 1
    ;;
  *)
    echo "Unknown command: $COMMAND" >&2
    usage
    exit 1
    ;;
esac
