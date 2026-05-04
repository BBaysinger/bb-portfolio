#!/usr/bin/env bash

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
COMMAND="${1:-}"
MIGRATION_TEMP_DIR=""

cleanup() {
  if [[ -n "$MIGRATION_TEMP_DIR" && -d "$MIGRATION_TEMP_DIR" ]]; then
    rm -rf "$MIGRATION_TEMP_DIR"
  fi
}

trap cleanup EXIT

if [[ ! "$COMMAND" =~ ^$|^-h$|^--help$|^help$|^migrate$ ]] && [[ "${CONTENT_WORKFLOW_DIR_READY:-}" != "true" ]]; then
  exec env CONTENT_WORKFLOW_DIR_READY=true bash "$REPO_ROOT/scripts/with-portfolio-content-dir.sh" bash "$0" "$@"
fi

MEDIA_COLLECTIONS=(
  project-brand-logos
  cv-experience-logos
  project-screenshots
  project-thumbnails
)

log() {
  echo "[content-workflow] $*"
}

die() {
  echo "[content-workflow] $*" >&2
  exit 1
}

resolve_content_dir() {
  [[ -n "${PORTFOLIO_CONTENT_DIR:-}" ]] || die "PORTFOLIO_CONTENT_DIR is required for this command."

  if [[ "$PORTFOLIO_CONTENT_DIR" = /* ]]; then
    printf '%s\n' "$PORTFOLIO_CONTENT_DIR"
  else
    printf '%s\n' "$REPO_ROOT/$PORTFOLIO_CONTENT_DIR"
  fi
}

set_profile_env() {
  local profile="$1"

  export ENV_PROFILE="$profile"
  if [[ "$profile" == "local" ]]; then
    unset USE_GITHUB_SECRETS || true
  else
    export USE_GITHUB_SECRETS=true
  fi
}

ensure_write_guard_for_target() {
  local target="$1"
  local explicit_confirm="${2:-false}"

  if [[ "$target" == "dev" && "${ALLOW_DEV_WRITE:-}" != "true" ]]; then
    die "Refusing to write to dev: set ALLOW_DEV_WRITE=true to continue."
  fi

  if [[ "$target" != "prod" ]]; then
    return
  fi

  [[ "${ALLOW_PROD_WRITE:-}" == "true" ]] ||
    die "Refusing to write to prod: set ALLOW_PROD_WRITE=true to continue."

  if [[ "$explicit_confirm" == "true" ]]; then
    return
  fi

  if [[ ! -t 0 || ! -t 1 ]]; then
    die "Production overwrite requires --confirm-prod-write when not running interactively."
  fi

  local confirm=""
  read -r -p "Type 'migrate-data-to-prod' to confirm production overwrite: " confirm
  [[ "$confirm" == "migrate-data-to-prod" ]] || die "Confirmation failed. Aborting production overwrite."
}

copy_local_media_to_content_dir() {
  local source_root="$REPO_ROOT/backend/media"

  for collection in "${MEDIA_COLLECTIONS[@]}"; do
    local source_dir="$source_root/$collection"
    local target_dir="$CONTENT_DIR/$collection"

    rm -rf "$target_dir"
    mkdir -p "$target_dir"

    if [[ -d "$source_dir" ]]; then
      cp -R "$source_dir/." "$target_dir/"
    fi
  done
}

pull_media_from_remote_env() {
  local source="$1"
  local dry_run="${2:-false}"
  local dry_flag=()

  if [[ "$dry_run" == "true" ]]; then
    dry_flag+=(--dry-run)
  fi

  for collection in "${MEDIA_COLLECTIONS[@]}"; do
    if ((${#dry_flag[@]})); then
      npm run media:pull -- --env "$source" --collection "$collection" "${dry_flag[@]}"
    else
      npm run media:pull -- --env "$source" --collection "$collection"
    fi
  done
}

export_authored_content() {
  local source="$1"
  local dry_run="${2:-false}"
  local dry_flag=()

  if [[ "$dry_run" == "true" ]]; then
    dry_flag+=(--dry-run)
  fi

  set_profile_env "$source"

  if ((${#dry_flag[@]})); then
    npm exec --prefix "$REPO_ROOT/backend" -- tsx "$REPO_ROOT/backend/scripts/lib/greeting-content.ts" export "${dry_flag[@]}"
    npm exec --prefix "$REPO_ROOT/backend" -- tsx "$REPO_ROOT/backend/scripts/lib/branding-lockup-content.ts" export "${dry_flag[@]}"
  else
    npm exec --prefix "$REPO_ROOT/backend" -- tsx "$REPO_ROOT/backend/scripts/lib/greeting-content.ts" export
    npm exec --prefix "$REPO_ROOT/backend" -- tsx "$REPO_ROOT/backend/scripts/lib/branding-lockup-content.ts" export
  fi

  (
    cd "$REPO_ROOT/backend"
    if ((${#dry_flag[@]})); then
      npm run export:project-descriptions -- --env "$source" "${dry_flag[@]}"
      npm run export:cv-content -- --env "$source" "${dry_flag[@]}"
    else
      npm run export:project-descriptions -- --env "$source"
      npm run export:cv-content -- --env "$source"
    fi
  )
}

export_full_dataset() {
  local source="$1"
  local dry_run="${2:-false}"

  log "Exporting full dataset from $source into $CONTENT_DIR"
  export_authored_content "$source" "$dry_run"

  if [[ "$source" == "local" ]]; then
    if [[ "$dry_run" == "true" ]]; then
      log "[DRY RUN] Would copy local backend/media collections into $CONTENT_DIR"
    else
      copy_local_media_to_content_dir
    fi
    return
  fi

  pull_media_from_remote_env "$source" "$dry_run"
}

stage_media_dataset() {
  local source="$1"

  log "Staging media dataset from $source into $CONTENT_DIR"

  if [[ "$source" == "local" ]]; then
    copy_local_media_to_content_dir
    return
  fi

  pull_media_from_remote_env "$source" false
}

seed_media_from_content_dir() {
  npm run media:seed
}

upload_media_to_remote_env() {
  local target="$1"
  local media_args=(--env "$target")

  if [[ "$target" == "prod" ]]; then
    media_args+=(--yes)
  fi

  npm run media:upload -- --env "$target" "${media_args[@]:2}"
}

import_authored_content() {
  local target="$1"
  local confirm_flag=()

  if [[ "$target" == "prod" ]]; then
    confirm_flag+=(--confirm-prod-write)
  fi

  set_profile_env "$target"

  if ((${#confirm_flag[@]})); then
    npm exec --prefix "$REPO_ROOT/backend" -- tsx "$REPO_ROOT/backend/scripts/lib/greeting-content.ts" import "${confirm_flag[@]}"
    npm exec --prefix "$REPO_ROOT/backend" -- tsx "$REPO_ROOT/backend/scripts/lib/branding-lockup-content.ts" import "${confirm_flag[@]}"
  else
    npm exec --prefix "$REPO_ROOT/backend" -- tsx "$REPO_ROOT/backend/scripts/lib/greeting-content.ts" import
    npm exec --prefix "$REPO_ROOT/backend" -- tsx "$REPO_ROOT/backend/scripts/lib/branding-lockup-content.ts" import
  fi

  (
    cd "$REPO_ROOT/backend"
    if ((${#confirm_flag[@]})); then
      npm run import:project-descriptions -- --env "$target" "${confirm_flag[@]}"
      npm run import:cv-content -- --env "$target" "${confirm_flag[@]}"
    else
      npm run import:project-descriptions -- --env "$target"
      npm run import:cv-content -- --env "$target"
    fi
  )
}

revalidate_project_routes_for_target() {
  local target="$1"
  local source="${2:-unknown}"

  set_profile_env "$target"

  log "Triggering frontend project revalidation for $target after migrate from $source"
  npm exec --prefix "$REPO_ROOT/backend" -- tsx "$REPO_ROOT/backend/scripts/revalidate-project-routes.ts" "--reason=contentWorkflow.migrate:${source}-to-${target}"
}

apply_full_dataset_to_target() {
  local target="$1"
  local explicit_confirm="${2:-false}"

  ensure_write_guard_for_target "$target" "$explicit_confirm"
  log "Applying full dataset from $CONTENT_DIR into $target"

  seed_media_from_content_dir

  if [[ "$target" != "local" ]]; then
    upload_media_to_remote_env "$target"
  fi

  import_authored_content "$target"
}

sync_database_between_envs() {
  local source="$1"
  local target="$2"

  set_profile_env "$target"

  log "Migrating full CMS database from $source to $target"
  bash "$REPO_ROOT/scripts/migrate-database.sh" "$source" "$target" --yes
}

apply_media_dataset_to_target() {
  local target="$1"
  local explicit_confirm="${2:-false}"

  ensure_write_guard_for_target "$target" "$explicit_confirm"
  log "Applying staged media dataset from $CONTENT_DIR into $target"

  seed_media_from_content_dir

  if [[ "$target" != "local" ]]; then
    upload_media_to_remote_env "$target"
  fi
}

parse_migrate_args() {
  SOURCE_ENV=""
  TARGET_ENV=""
  EXPLICIT_PROD_CONFIRM=false

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
        EXPLICIT_PROD_CONFIRM=true
        shift
        ;;
      *)
        die "Unknown migrate option: $1"
        ;;
    esac
  done

  [[ "$SOURCE_ENV" =~ ^(local|dev|prod)$ ]] || die "--source must be one of: local, dev, prod"
  [[ "$TARGET_ENV" =~ ^(local|dev|prod)$ ]] || die "--target must be one of: local, dev, prod"
  [[ "$SOURCE_ENV" != "$TARGET_ENV" ]] || die "Source and target must differ."
}

usage() {
  cat >&2 <<'EOF'
Usage: scripts/content-workflow.sh <command>

Commands:
  migrate         Sync the full CMS database from --source local|dev|prod into --target local|dev|prod, plus stage and apply supported media collections
                  Requires ALLOW_DEV_WRITE=true for dev targets. Prod targets require ALLOW_PROD_WRITE=true and still enforce separate prod confirmation.
  import-local    Seed media and import greeting + branding lockup + project descriptions + CV into local
  import-dev      Import greeting + branding lockup + project descriptions + CV into dev (requires ALLOW_DEV_WRITE=true)
  import-prod     Import greeting + branding lockup + project descriptions + CV into prod (requires ALLOW_PROD_WRITE=true and prod confirmation)
  pull-local      Export local media + authored content into configured content root
  pull-dev        Pull dev media + export greeting + branding lockup + authored content into configured content root
  pull-prod       Pull prod media + export greeting + branding lockup + authored content into configured content root
  pull-prod-dry   Dry-run variant of pull-prod
EOF
}

run_import_local() {
  CONTENT_DIR="$(resolve_content_dir)"
  apply_full_dataset_to_target local false
}

run_import_dev() {
  CONTENT_DIR="$(resolve_content_dir)"
  apply_full_dataset_to_target dev false
}

run_import_prod() {
  local explicit_confirm="${1:-false}"
  CONTENT_DIR="$(resolve_content_dir)"
  apply_full_dataset_to_target prod "$explicit_confirm"
}

run_pull_local() {
  CONTENT_DIR="$(resolve_content_dir)"
  export_full_dataset local false
}

run_pull_dev() {
  CONTENT_DIR="$(resolve_content_dir)"
  export_full_dataset dev false
}

run_pull_prod() {
  CONTENT_DIR="$(resolve_content_dir)"
  export_full_dataset prod false
}

run_pull_prod_dry() {
  CONTENT_DIR="$(resolve_content_dir)"
  export_full_dataset prod true
}

run_migrate() {
  parse_migrate_args "$@"
  MIGRATION_TEMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/bb-portfolio-migrate.XXXXXX")"
  CONTENT_DIR="$MIGRATION_TEMP_DIR"
  export PORTFOLIO_CONTENT_DIR="$CONTENT_DIR"
  log "Using temporary migration staging dir: $CONTENT_DIR"
  stage_media_dataset "$SOURCE_ENV"
  apply_media_dataset_to_target "$TARGET_ENV" "$EXPLICIT_PROD_CONFIRM"
  sync_database_between_envs "$SOURCE_ENV" "$TARGET_ENV"
  revalidate_project_routes_for_target "$TARGET_ENV" "$SOURCE_ENV"
}

case "$COMMAND" in
  migrate)
    shift
    run_migrate "$@"
    ;;
  import-local)
    run_import_local
    ;;
  import-dev)
    run_import_dev
    ;;
  import-prod)
    shift
    explicit_confirm=false
    if [[ "${1:-}" == "--confirm-prod-write" ]]; then
      explicit_confirm=true
      shift
    fi
    run_import_prod "$explicit_confirm"
    ;;
  pull-local)
    run_pull_local
    ;;
  pull-dev)
    run_pull_dev
    ;;
  pull-prod)
    run_pull_prod
    ;;
  pull-prod-dry)
    run_pull_prod_dry
    ;;
  -h | --help | help)
    usage
    exit 0
    ;;
  "")
    usage
    exit 1
    ;;
  *)
    echo "Unknown command: $COMMAND" >&2
    usage
    exit 1
    ;;
esac
