#!/bin/bash
# =============================================================================
# Restore MongoDB collections from a mongodump backup folder
# =============================================================================
# Restores one or more collections from an on-disk mongodump directory into a
# target environment database (Atlas/local), using mongorestore.
#
# Typical use-case: restore Payload auth collections (users, payload-preferences)
# after a partial DB migration.
#
# Usage:
#   ./restore-collections-from-backup.sh <target_env> [backup_dir] [options]
#
# Examples:
#   ./restore-collections-from-backup.sh prod --dry-run
#   ./restore-collections-from-backup.sh prod data/database-backups/20260109_221534_prod_backup/bb-portfolio-prod --yes
#   ./restore-collections-from-backup.sh prod --collections users --yes
#
# Prerequisites:
#   - MongoDB Database Tools (mongorestore)
#   - Network access to MongoDB Atlas cluster
# =============================================================================

set -eEo pipefail

TARGET_ENV="${1:-}"

# Optional positional arg; if it looks like a flag, treat as omitted.
BACKUP_DIR="${2:-}"
if [[ -n "$BACKUP_DIR" && "$BACKUP_DIR" == --* ]]; then
  BACKUP_DIR=""
fi

shift $(( $# > 0 ? 1 : 0 ))
if [[ -n "$BACKUP_DIR" ]]; then
  shift $(( $# > 0 ? 1 : 0 ))
fi

DRY_RUN=false
ASSUME_YES=false
DROP=true
VERBOSE=false
QUIET_FLAG=--quiet
TARGET_DB_OVERRIDE=""
COLLECTIONS_CSV="users,payload-preferences"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }

on_error() {
  local exit_code=$?
  local cmd="${BASH_COMMAND}"
  local line="${BASH_LINENO[0]}"
  log_error "A command failed (exit ${exit_code}) at line ${line}: ${cmd}"
  exit "$exit_code"
}
trap 'on_error' ERR

usage() {
  log_error "Usage: $0 <target_env> [backup_dir] [--collections users,payload-preferences] [--target-db <name>] [--no-drop] [--dry-run] [--yes] [--verbose]"
  echo "  target_env: local | dev | prod"
  echo "  backup_dir: Path to a mongodump directory (e.g., .../bb-portfolio-prod) or a timestamp folder containing it"
}

mask_uri() {
  local uri="$1"
  echo "$uri" | sed -E 's#(://)[^/@:]+(:[^/@]+)?(@)#\1****:****\3#'
}

load_env_if_needed() {
  if [[ -n "${MONGODB_BASE_URI:-}" ]]; then
    return
  fi
  local candidates=(".env.local" ".env" "infra/.env")
  for f in "${candidates[@]}"; do
    if [[ -f "$f" ]]; then
      log_info "Loading environment variables from $f"
      set -a
      # shellcheck disable=SC1090
      source "$f"
      set +a
      if [[ -n "${MONGODB_BASE_URI:-}" && "${MONGODB_BASE_URI}" != *"username:password@"* ]]; then
        log_info "MONGODB_BASE_URI loaded from $f"
        break
      fi
    fi
  done
}

normalize_base_uri() {
  local uri="$1"
  echo "$uri" | sed -E 's#^(mongodb(\+srv)?://[^/]+)(/[^?]*)?(\?.*)?$#\1#'
}

get_base_uri_for_env() {
  local env_key="$1"
  local upper_env
  upper_env=$(echo "$env_key" | tr '[:lower:]' '[:upper:]')
  local var_name="MONGODB_BASE_URI_${upper_env}"
  local value="${!var_name:-}"
  if [[ -n "$value" ]]; then
    echo "$value"
  else
    echo "${MONGODB_BASE_URI:-}"
  fi
}

get_db_name() {
  local env_key="$1"
  local upper_env
  upper_env=$(echo "$env_key" | tr '[:lower:]' '[:upper:]')
  local var_name="MONGODB_DB_NAME_${upper_env}"
  local override="${!var_name:-}"
  if [[ -n "$override" ]]; then
    echo "$override"
    return
  fi
  case "$env_key" in
    local) echo "bb-portfolio-local" ;;
    dev) echo "bb-portfolio-dev" ;;
    prod) echo "bb-portfolio-prod" ;;
    *) echo "unknown" ;;
  esac
}

check_mongorestore() {
  if ! command -v mongorestore &> /dev/null; then
    log_error "mongorestore not found. Install MongoDB Database Tools:"
    echo "  brew install mongodb/brew/mongodb-database-tools"
    exit 1
  fi
}

parse_flags() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --dry-run)
        DRY_RUN=true
        shift
        ;;
      --yes)
        ASSUME_YES=true
        shift
        ;;
      --no-drop)
        DROP=false
        shift
        ;;
      --verbose)
        VERBOSE=true
        QUIET_FLAG=""
        shift
        ;;
      --target-db)
        TARGET_DB_OVERRIDE="$2"; shift 2
        ;;
      --collections)
        COLLECTIONS_CSV="$2"; shift 2
        ;;
      *)
        log_warning "Unknown option: $1"
        shift
        ;;
    esac
  done
}

resolve_backup_db_dir() {
  local env_key="$1"
  local db_name="$2"
  local provided="$3"

  if [[ -z "$provided" ]]; then
    local latest
    latest=$(ls -1d "data/database-backups"/*"_${env_key}_backup" 2>/dev/null | sort | tail -n 1 || true)
    if [[ -z "$latest" ]]; then
      log_error "No backups found under data/database-backups for env '${env_key}'."
      exit 1
    fi
    log_info "Auto-selected latest backup folder: $latest" >&2
    if [[ -d "$latest/$db_name" ]]; then
      echo "$latest/$db_name"
      return
    fi

    # Fall back: if exactly one subdirectory exists, use it.
    local subdirs
    subdirs=$(find "$latest" -maxdepth 1 -mindepth 1 -type d -print | wc -l | tr -d ' ')
    if [[ "$subdirs" == "1" ]]; then
      find "$latest" -maxdepth 1 -mindepth 1 -type d -print
      return
    fi

    log_error "Could not locate DB dump directory under $latest (expected $db_name)."
    exit 1
  fi

  if [[ ! -d "$provided" ]]; then
    log_error "Backup path not found or not a directory: $provided"
    exit 1
  fi

  # If this looks like the DB dump folder already (contains prelude.json or any .bson), use it.
  if [[ -f "$provided/prelude.json" ]] || ls "$provided"/*.bson &>/dev/null; then
    echo "$provided"
    return
  fi

  # If the provided path is a timestamp folder, try to find a db dump directory inside it.
  if [[ -d "$provided/$db_name" ]]; then
    echo "$provided/$db_name"
    return
  fi

  local subdirs
  subdirs=$(find "$provided" -maxdepth 1 -mindepth 1 -type d -print | wc -l | tr -d ' ')
  if [[ "$subdirs" == "1" ]]; then
    find "$provided" -maxdepth 1 -mindepth 1 -type d -print
    return
  fi

  log_error "Backup directory did not contain a recognizable mongodump DB folder."
  echo "Tip: pass the DB folder directly (it contains .bson files), e.g.:"
  echo "  data/database-backups/<timestamp>_${env_key}_backup/${db_name}"
  exit 1
}

confirm_or_exit() {
  if [[ "$ASSUME_YES" == true ]]; then
    return
  fi
  echo
  log_warning "This will write to the target database (and may drop collections first)."
  read -r -p "Type 'restore' to continue: " answer
  if [[ "$answer" != "restore" ]]; then
    log_info "Aborted."
    exit 1
  fi
}

main() {
  if [[ -z "$TARGET_ENV" ]]; then
    usage
    exit 1
  fi

  parse_flags "$@"

  load_env_if_needed

  local db_name
  db_name=$(get_db_name "$TARGET_ENV")
  if [[ "$db_name" == "unknown" ]]; then
    usage
    exit 1
  fi

  local target_db
  target_db="${TARGET_DB_OVERRIDE:-$db_name}"

  local base
  base=$(get_base_uri_for_env "$TARGET_ENV")
  base=$(normalize_base_uri "$base")

  if [[ -z "$base" || "$base" == *"username:password@"* ]]; then
    log_error "Missing MONGODB_BASE_URI (or env-specific MONGODB_BASE_URI_${TARGET_ENV^^}) with real credentials."
    echo "Tip: set it in .env.local, .env, or infra/.env"
    exit 1
  fi

  local target_uri
  target_uri="${base}/${target_db}?retryWrites=true&w=majority&appName=bb-portfolio-2025"
  local target_uri_masked
  target_uri_masked=$(mask_uri "$target_uri")

  local dump_dir
  dump_dir=$(resolve_backup_db_dir "$TARGET_ENV" "$db_name" "$BACKUP_DIR")

  log_info "Target env: ${TARGET_ENV}"
  log_info "Target DB: ${target_db}"
  log_info "Target URI: ${target_uri_masked}"
  log_info "Backup DB dump dir: ${dump_dir}"
  log_info "Collections: ${COLLECTIONS_CSV}"

  local IFS=','
  read -r -a collections <<< "$COLLECTIONS_CSV"

  local cmd=(mongorestore)
  if [[ -n "$QUIET_FLAG" ]]; then
    cmd+=("$QUIET_FLAG")
  fi
  cmd+=("--uri" "$target_uri")

  for c in "${collections[@]}"; do
    c=$(echo "$c" | xargs)
    if [[ -z "$c" ]]; then
      continue
    fi

    if [[ ! -f "$dump_dir/${c}.bson" ]]; then
      log_warning "Collection dump not found in backup folder: ${dump_dir}/${c}.bson"
    fi

    cmd+=("--nsInclude" "${target_db}.${c}")
  done

  if [[ "$DROP" == true ]]; then
    cmd+=("--drop")
  fi

  cmd+=("$dump_dir")

  echo
  log_info "Command:"
  # Never print the raw URI (it contains credentials). Print a sanitized equivalent.
  local cmd_print=("${cmd[@]}")
  for ((i=0; i<${#cmd_print[@]}; i++)); do
    if [[ "${cmd_print[$i]}" == "--uri" ]]; then
      cmd_print[$((i+1))]="$target_uri_masked"
      break
    fi
  done
  printf '  %q' "${cmd_print[@]}"
  echo

  if [[ "$DRY_RUN" == true ]]; then
    log_success "Dry run: no changes made."
    exit 0
  fi

  check_mongorestore
  confirm_or_exit

  log_info "Restoring collections into ${TARGET_ENV}..."
  "${cmd[@]}"
  log_success "Restore complete."
}

main "$@"
