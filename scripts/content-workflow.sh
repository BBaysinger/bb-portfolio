#!/usr/bin/env bash

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

usage() {
  cat >&2 <<'EOF'
Usage: scripts/content-workflow.sh <command>

Commands:
  import-local    Seed media and import greeting + branding lockup + project descriptions + CV into local
  import-dev      Import greeting + branding lockup + project descriptions + CV into dev (requires ALLOW_DEV_WRITE=true)
  pull-prod       Pull prod media + export greeting + branding lockup + authored content into configured content root
  pull-prod-dry   Dry-run variant of pull-prod
EOF
}

run_with_content_dir() {
  bash "$REPO_ROOT/scripts/with-portfolio-content-dir.sh" "$@"
}

run_import_local() {
  run_with_content_dir sh -c 'npm run media:seed && ENV_PROFILE=local npm exec --prefix "$0/backend" -- tsx "$0/backend/scripts/lib/greeting-content.ts" import && ENV_PROFILE=local npm exec --prefix "$0/backend" -- tsx "$0/backend/scripts/lib/branding-lockup-content.ts" import && cd "$0/backend" && npm run import:project-descriptions -- --env local && npm run import:cv-content -- --env local' "$REPO_ROOT"
}

run_import_dev() {
  run_with_content_dir sh -c 'test "${ALLOW_DEV_WRITE:-}" = "true" || { echo "Set ALLOW_DEV_WRITE=true to import into dev." >&2; exit 1; }; ENV_PROFILE=dev USE_GITHUB_SECRETS=true npm exec --prefix "$0/backend" -- tsx "$0/backend/scripts/lib/greeting-content.ts" import && ENV_PROFILE=dev USE_GITHUB_SECRETS=true npm exec --prefix "$0/backend" -- tsx "$0/backend/scripts/lib/branding-lockup-content.ts" import && cd "$0/backend" && USE_GITHUB_SECRETS=true npm run import:project-descriptions -- --env dev && USE_GITHUB_SECRETS=true npm run import:cv-content -- --env dev' "$REPO_ROOT"
}

run_pull_prod() {
  run_with_content_dir sh -c 'npm run media:pull:prod:cv-experience-logos -- --seedings-dir "$PORTFOLIO_CONTENT_DIR" && npm run media:pull:prod:project-brand-logos -- --seedings-dir "$PORTFOLIO_CONTENT_DIR" && ENV_PROFILE=prod USE_GITHUB_SECRETS=true npm exec --prefix "$0/backend" -- tsx "$0/backend/scripts/lib/greeting-content.ts" export && ENV_PROFILE=prod USE_GITHUB_SECRETS=true npm exec --prefix "$0/backend" -- tsx "$0/backend/scripts/lib/branding-lockup-content.ts" export && cd "$0/backend" && USE_GITHUB_SECRETS=true npm run export:project-descriptions -- --env prod && USE_GITHUB_SECRETS=true npm run export:cv-content -- --env prod' "$REPO_ROOT"
}

run_pull_prod_dry() {
  run_with_content_dir sh -c 'npm run media:pull:prod:cv-experience-logos:dry -- --seedings-dir "$PORTFOLIO_CONTENT_DIR" && npm run media:pull:prod:project-brand-logos:dry -- --seedings-dir "$PORTFOLIO_CONTENT_DIR" && ENV_PROFILE=prod USE_GITHUB_SECRETS=true npm exec --prefix "$0/backend" -- tsx "$0/backend/scripts/lib/greeting-content.ts" export --dry-run && ENV_PROFILE=prod USE_GITHUB_SECRETS=true npm exec --prefix "$0/backend" -- tsx "$0/backend/scripts/lib/branding-lockup-content.ts" export --dry-run && cd "$0/backend" && USE_GITHUB_SECRETS=true npm run export:project-descriptions -- --env prod --dry-run && USE_GITHUB_SECRETS=true npm run export:cv-content -- --env prod --dry-run' "$REPO_ROOT"
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
