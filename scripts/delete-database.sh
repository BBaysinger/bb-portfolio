#!/bin/bash
# =============================================================================
# MongoDB Database Deletion Script (with automatic pre-delete backup)
# =============================================================================
# Safely drops a MongoDB database after creating a mongodump backup.
#
# Usage examples:
#   ./delete-database.sh --env local --db portfolio-local         # backup + drop
#   ./delete-database.sh --env prod --db portfolio-prod --dry-run # show plan
#   ./delete-database.sh --env dev --db bb-portfolio-dev --yes    # no prompt
#
# Env resolution:
#   - Base URI comes from MONGODB_BASE_URI or per-env override:
#       MONGODB_BASE_URI_LOCAL / _DEV / _PROD
#   - If --db is omitted, database name defaults to per-env name via
#       MONGODB_DB_NAME_LOCAL / _DEV / _PROD or portfolio-<env>
# =============================================================================

set -eEo pipefail
DRY_RUN=false
ASSUME_YES=false
VERBOSE=false
QUIET_FLAG=--quiet
ENV_KEY=""
DB_NAME=""

# Colors
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
  echo "Tip: re-run with --verbose to see detailed command output."
  exit "$exit_code"
}
trap 'on_error' ERR

mask_uri() {
  local uri="$1"
  echo "$uri" | sed -E 's#(://)[^/@:]+(:[^/@]+)?(@)#\1****:****\3#'
}

parse_flags() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --env)
        ENV_KEY="$2"; shift 2;;
      --db)
        DB_NAME="$2"; shift 2;;
      --dry-run)
        DRY_RUN=true; shift;;
      --yes)
        ASSUME_YES=true; shift;;
      --verbose)
        VERBOSE=true; shift;;
      *)
        log_warning "Unknown option: $1"; shift;;
    esac
  done
}

if [[ -n "$PS4" ]]; then :; fi

normalize_base_uri() {
  local uri="$1"
  echo "$uri" | sed -E 's#^(mongodb(\+srv)?://[^/]+)(/[^?]*)?(\?.*)?$#\1#'
}

get_default_db_name() {
  local key="$1"
  case "$key" in
    local) echo "portfolio-local";;
    dev) echo "portfolio-dev";;
    prod) echo "portfolio-prod";;
    *) echo "unknown";;
  esac
}

get_env_db_name() {
  local key="$1"
  local upper; upper=$(echo "$key" | tr '[:lower:]' '[:upper:]')
  local var="MONGODB_DB_NAME_${upper}"
  local val="${!var}"
  if [[ -n "$val" ]]; then echo "$val"; else echo "$(get_default_db_name "$key")"; fi
}

get_base_uri_for_env() {
  local key="$1"
  local upper; upper=$(echo "$key" | tr '[:lower:]' '[:upper:]')
  local var="MONGODB_BASE_URI_${upper}"
  local val="${!var}"
  if [[ -n "$val" ]]; then echo "$val"; else echo "$MONGODB_BASE_URI"; fi
}

load_env_if_needed() {
  local candidates=(".env.local" ".env" "infra/.env")
  for f in "${candidates[@]}"; do
    if [[ -f "$f" ]]; then
      log_info "Loading environment variables from $f"
      set -a
      # shellcheck disable=SC1090
      source "$f"
      set +a
    fi
  done
}

check_tools() {
  if ! command -v mongodump &>/dev/null; then
    log_error "mongodump not found. Install with: brew install mongodb/brew/mongodb-database-tools"
    exit 1
  fi
  if ! command -v mongosh &>/dev/null; then
    log_error "mongosh not found. Install with: brew install mongosh"
    exit 1
  fi
}

confirm_delete() {
  local db="$1"
  echo
  log_warning "DESTRUCTIVE OPERATION: Database will be DROPPED"
  echo "  Target database: $db"
  echo
  if [[ "$DRY_RUN" == "true" ]]; then
    log_info "Dry run enabled: nothing will be deleted."
    return
  fi
  if [[ "$ASSUME_YES" == "true" ]]; then
    log_info "--yes provided: skipping interactive confirmation."
    return
  fi
  local prompt="Type 'DELETE ${db}' to confirm: "
  local input
  if [[ -t 0 && -r /dev/tty ]]; then
    read -r -p "$prompt" input </dev/tty
  else
    read -r -p "$prompt" input
  fi
  if [[ "$input" != "DELETE ${db}" ]]; then
    log_info "Deletion cancelled."
    exit 0
  fi
}

main() {
  parse_flags "$@"
  if [[ "$VERBOSE" == "true" ]]; then set -x; QUIET_FLAG=; fi
  echo "🗑️  MongoDB Database Deletion Tool"
  echo "=================================="
  echo
  load_env_if_needed
  check_tools

  if [[ -z "$ENV_KEY" && -z "$DB_NAME" ]]; then
    log_error "Provide --env <local|dev|prod> and/or --db <name>"
    exit 1
  fi
  if [[ -z "$ENV_KEY" ]]; then ENV_KEY="dev"; fi
  if [[ -z "$DB_NAME" ]]; then DB_NAME="$(get_env_db_name "$ENV_KEY")"; fi

  local base full_uri backup_dir
  base=$(normalize_base_uri "$(get_base_uri_for_env "$ENV_KEY")")
  full_uri="${base}/${DB_NAME}?retryWrites=true&w=majority&appName=bb-portfolio-2025"

  echo "Plan:"
  echo "  Base URI: $(mask_uri "$base")"
  echo "  Database: $DB_NAME"
  echo "  Will run: mongodump --uri \"$full_uri\" --out \"data/database-backups/<timestamp>_${DB_NAME}_pre-delete\""
  echo "  Then:     mongosh \"${base}/${DB_NAME}\" --quiet --eval 'db.dropDatabase()'"
  echo

  confirm_delete "$DB_NAME"
  if [[ "$DRY_RUN" == "true" ]]; then return; fi

  backup_dir="data/database-backups/$(date +%Y%m%d_%H%M%S)_${DB_NAME}_pre-delete"
  log_info "Creating backup: $backup_dir"
  mkdir -p "$backup_dir"
  mongodump --uri "$full_uri" --out "$backup_dir" ${QUIET_FLAG:+$QUIET_FLAG}
  log_success "Backup created at $backup_dir"

  log_info "Dropping database: $DB_NAME"
  mongosh "${base}/${DB_NAME}" --quiet --eval 'db.dropDatabase()'
  log_success "Database dropped: $DB_NAME"
}

main "$@"
