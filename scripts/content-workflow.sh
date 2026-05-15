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

PROJECT_MEDIA_COLLECTIONS=(
  project-brand-logos
  project-screenshots
  project-thumbnails
)

CV_MEDIA_COLLECTIONS=(
  cv-experience-logos
)

log() {
  echo "[content-workflow] $*"
}

die() {
  echo "[content-workflow] $*" >&2
  exit 1
}

hash_file() {
  shasum -a 256 "$1" | awk '{print $1}'
}

resolve_dir_from_repo_root() {
  local value="$1"

  if [[ "$value" = /* ]]; then
    printf '%s\n' "$value"
  else
    printf '%s\n' "$REPO_ROOT/$value"
  fi
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
  local enforce_seedings_guard="${1:-false}"
  local source_root="$REPO_ROOT/backend/media"

  if [[ "$enforce_seedings_guard" == "true" ]]; then
    local seed_root="$REPO_ROOT/../cms-media-seedings"
    if [[ -d "$seed_root" ]]; then
      local -a mismatches=()
      local collection local_dir seed_dir local_file rel_path seed_file local_hash seed_hash

      for collection in "${MEDIA_COLLECTIONS[@]}"; do
        local_dir="$source_root/$collection"
        seed_dir="$seed_root/$collection"

        [[ -d "$local_dir" && -d "$seed_dir" ]] || continue

        while IFS= read -r -d '' local_file; do
          rel_path="${local_file#"$local_dir"/}"
          seed_file="$seed_dir/$rel_path"

          [[ -f "$seed_file" ]] || continue

          local_hash="$(hash_file "$local_file")"
          seed_hash="$(hash_file "$seed_file")"

          if [[ "$local_hash" != "$seed_hash" ]]; then
            mismatches+=("$collection/$rel_path")
          fi
        done < <(
          find "$local_dir" -type f \
            ! -name '.DS_Store' \
            ! -name '.gitignore' \
            ! -name '.gitkeep' \
            -print0
        )
      done

      if ((${#mismatches[@]} > 0)); then
        printf '[content-workflow] Refusing local migrate because backend/media diverges from ../cms-media-seedings for:%s\n' "" >&2
        printf '  - %s\n' "${mismatches[@]}" >&2
        die "Local media is authoritative for migrate. Reconcile backend/media and cms-media-seedings before retrying."
      fi
    fi
  fi

  log "Copying local media from $source_root into $CONTENT_DIR"

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
    copy_local_media_to_content_dir true
    return
  fi

  pull_media_from_remote_env "$source" false
}

seed_media_from_content_dir() {
  local -a selected_collections=()

  if (($# > 0)); then
    selected_collections=("$@")
  fi

  if ((${#selected_collections[@]} == 0)); then
    npm run media:seed
    return
  fi

  local seed_args=()
  local collection
  if ((${#selected_collections[@]} > 0)); then
    for collection in "${selected_collections[@]}"; do
      seed_args+=(--collection "$collection")
    done
  fi

  npm run media:seed -- "${seed_args[@]}"
}

upload_media_to_remote_env() {
  local target="$1"
  shift
  local -a selected_collections=()

  if (($# > 0)); then
    selected_collections=("$@")
  fi
  local media_args=(--env "$target")

  if [[ "$target" == "prod" ]]; then
    media_args+=(--yes)
  fi

  local collection
  if ((${#selected_collections[@]} > 0)); then
    for collection in "${selected_collections[@]}"; do
      media_args+=(--collection "$collection")
    done
  fi

  npm run media:upload -- "${media_args[@]}"
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

refresh_media_cache_versions_for_target() {
  local target="$1"

  set_profile_env "$target"

  log "Refreshing media cache version tokens for $target"
  (
    cd "$REPO_ROOT/backend"
    npm exec -- tsx ./scripts/touch-media-cache-versions.ts --env "$target" --skip-confirmation
  )
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
  shift 2
  local -a selected_collections=()

  if (($# > 0)); then
    selected_collections=("$@")
  fi

  ensure_write_guard_for_target "$target" "$explicit_confirm"
  log "Applying staged media dataset from $CONTENT_DIR into $target"

  if ((${#selected_collections[@]} > 0)); then
    seed_media_from_content_dir "${selected_collections[@]}"
  else
    seed_media_from_content_dir
  fi

  if [[ "$target" != "local" ]]; then
    if ((${#selected_collections[@]} > 0)); then
      upload_media_to_remote_env "$target" "${selected_collections[@]}"
    else
      upload_media_to_remote_env "$target"
    fi
  fi
}

import_projects_content() {
  local target="$1"
  local confirm_flag=()

  if [[ "$target" == "prod" ]]; then
    confirm_flag+=(--confirm-prod-write)
  fi

  set_profile_env "$target"

  (
    cd "$REPO_ROOT/backend"
    if ((${#confirm_flag[@]})); then
      npm run import:project-descriptions -- --env "$target" "${confirm_flag[@]}"
    else
      npm run import:project-descriptions -- --env "$target"
    fi
  )
}

import_cv_content() {
  local target="$1"
  local confirm_flag=()

  if [[ "$target" == "prod" ]]; then
    confirm_flag+=(--confirm-prod-write)
  fi

  set_profile_env "$target"

  (
    cd "$REPO_ROOT/backend"
    if ((${#confirm_flag[@]})); then
      npm run import:cv-content -- --env "$target" "${confirm_flag[@]}"
    else
      npm run import:cv-content -- --env "$target"
    fi
  )
}

apply_projects_dataset_to_target() {
  local target="$1"
  local explicit_confirm="${2:-false}"

  ensure_write_guard_for_target "$target" "$explicit_confirm"
  log "Applying project descriptions + project media from $CONTENT_DIR into $target"

  seed_media_from_content_dir "${PROJECT_MEDIA_COLLECTIONS[@]}"

  if [[ "$target" != "local" ]]; then
    upload_media_to_remote_env "$target" "${PROJECT_MEDIA_COLLECTIONS[@]}"
  fi

  import_projects_content "$target"
}

apply_cv_dataset_to_target() {
  local target="$1"
  local explicit_confirm="${2:-false}"

  ensure_write_guard_for_target "$target" "$explicit_confirm"
  log "Applying CV experiences + CV logos from $CONTENT_DIR into $target"

  seed_media_from_content_dir "${CV_MEDIA_COLLECTIONS[@]}"

  if [[ "$target" != "local" ]]; then
    upload_media_to_remote_env "$target" "${CV_MEDIA_COLLECTIONS[@]}"
  fi

  import_cv_content "$target"
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
                  Does not read PORTFOLIO_CONTENT_DIR and does not auto-run authored-content import commands; those remain the explicit import-* workflows below.
  import-local    Seed media and import greeting + branding lockup + project descriptions + CV into local
  import-dev      Import greeting + branding lockup + project descriptions + CV into dev (requires ALLOW_DEV_WRITE=true)
  import-prod     Import greeting + branding lockup + project descriptions + CV into prod (requires ALLOW_PROD_WRITE=true and prod confirmation)
  import-projects-local  Seed project media and import only project descriptions into local
  import-projects-dev    Upload project media and import only project descriptions into dev (requires ALLOW_DEV_WRITE=true)
  import-projects-prod   Upload project media and import only project descriptions into prod (requires ALLOW_PROD_WRITE=true and prod confirmation)
  import-cv-local        Seed CV logos and import only CV experiences into local
  import-cv-dev          Upload CV logos and import only CV experiences into dev (requires ALLOW_DEV_WRITE=true)
  import-cv-prod         Upload CV logos and import only CV experiences into prod (requires ALLOW_PROD_WRITE=true and prod confirmation)
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

run_import_projects_local() {
  CONTENT_DIR="$(resolve_content_dir)"
  apply_projects_dataset_to_target local false
}

run_import_projects_dev() {
  CONTENT_DIR="$(resolve_content_dir)"
  apply_projects_dataset_to_target dev false
}

run_import_projects_prod() {
  local explicit_confirm="${1:-false}"
  CONTENT_DIR="$(resolve_content_dir)"
  apply_projects_dataset_to_target prod "$explicit_confirm"
}

run_import_cv_local() {
  CONTENT_DIR="$(resolve_content_dir)"
  apply_cv_dataset_to_target local false
}

run_import_cv_dev() {
  CONTENT_DIR="$(resolve_content_dir)"
  apply_cv_dataset_to_target dev false
}

run_import_cv_prod() {
  local explicit_confirm="${1:-false}"
  CONTENT_DIR="$(resolve_content_dir)"
  apply_cv_dataset_to_target prod "$explicit_confirm"
}

run_pull_local() {
  CONTENT_DIR="$(resolve_content_dir)"
  export_full_dataset local false
}

ensure_nonlocal_pull_uses_explicit_dir() {
  local source="$1"
  local configured_source="${PORTFOLIO_CONTENT_DIR_SOURCE:-unknown}"

  [[ "$source" != "local" ]] || return 0

  if [[ "$configured_source" != "explicit-env" ]]; then
    die "pull-$source requires an explicit PORTFOLIO_CONTENT_DIR override and will not write to the canonical local snapshot directory by default."
  fi

  if [[ -n "${CANONICAL_PORTFOLIO_CONTENT_DIR:-}" ]]; then
    local requested_dir canonical_dir
    requested_dir="$(resolve_dir_from_repo_root "$PORTFOLIO_CONTENT_DIR")"
    canonical_dir="$(resolve_dir_from_repo_root "$CANONICAL_PORTFOLIO_CONTENT_DIR")"

    if [[ "$requested_dir" == "$canonical_dir" ]]; then
      die "pull-$source cannot overwrite the canonical local snapshot directory: $requested_dir"
    fi
  fi
}

run_pull_dev() {
  ensure_nonlocal_pull_uses_explicit_dir dev
  CONTENT_DIR="$(resolve_content_dir)"
  export_full_dataset dev false
}

run_pull_prod() {
  ensure_nonlocal_pull_uses_explicit_dir prod
  CONTENT_DIR="$(resolve_content_dir)"
  export_full_dataset prod false
}

run_pull_prod_dry() {
  ensure_nonlocal_pull_uses_explicit_dir prod
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
  refresh_media_cache_versions_for_target "$TARGET_ENV"
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
  import-projects-local)
    run_import_projects_local
    ;;
  import-projects-dev)
    run_import_projects_dev
    ;;
  import-projects-prod)
    shift
    explicit_confirm=false
    if [[ "${1:-}" == "--confirm-prod-write" ]]; then
      explicit_confirm=true
      shift
    fi
    run_import_projects_prod "$explicit_confirm"
    ;;
  import-cv-local)
    run_import_cv_local
    ;;
  import-cv-dev)
    run_import_cv_dev
    ;;
  import-cv-prod)
    shift
    explicit_confirm=false
    if [[ "${1:-}" == "--confirm-prod-write" ]]; then
      explicit_confirm=true
      shift
    fi
    run_import_cv_prod "$explicit_confirm"
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
