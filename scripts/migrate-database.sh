#!/bin/bash
# =============================================================================
# MongoDB Database Migration Script
# =============================================================================
# This script uses mongodump/mongorestore to copy data between environments
# 
# Usage:
#   ./migrate-database.sh <source> <target> [--dry-run] [--no-backup]
#
# Examples:
#   ./migrate-database.sh local prod            # Copy local → production
#   ./migrate-database.sh local dev             # Copy local → development  
#   ./migrate-database.sh prod dev              # Copy production → development
#   ./migrate-database.sh local dev --dry-run   # Plan only (no backup/restore)
#   ./migrate-database.sh prod dev --no-backup  # Skip target backup (not recommended)
#
# Prerequisites:
#   - MongoDB tools (mongodump, mongorestore) installed
#   - Network access to MongoDB Atlas cluster
# =============================================================================

set -eEo pipefail  # Exit on error, propagate ERR in functions, and fail on pipeline errors
# Flags (default values)
DRY_RUN=false
NO_BACKUP=false
ASSUME_YES=false
VERBOSE=false
QUIET_FLAG=--quiet
SOURCE_DB_OVERRIDE=""
TARGET_DB_OVERRIDE=""

# Trap errors to provide a helpful message when something fails silently
on_error() {
  local exit_code=$?
  local cmd="${BASH_COMMAND}"
  local line="${BASH_LINENO[0]}"
  log_error "A command failed (exit ${exit_code}) at line ${line}: ${cmd}"
  echo "Tip: re-run with --verbose to see detailed command output."
  exit "$exit_code"
}
trap 'on_error' ERR

# Mask credentials in a MongoDB URI for display
mask_uri() {
  local uri="$1"
  # Replace credentials between '://' and '@' with ****:**** if present
  echo "$uri" | sed -E 's#(://)[^/@:]+(:[^/@]+)?(@)#\1****:****\3#'
}

# Parse optional flags after source and target
parse_flags() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --dry-run)
        DRY_RUN=true
        shift
        ;;
      --no-backup)
        NO_BACKUP=true
        shift
        ;;
      --yes)
        ASSUME_YES=true
        shift
        ;;
      --verbose)
        VERBOSE=true
        shift
        ;;
      --source-db)
        SOURCE_DB_OVERRIDE="$2"; shift 2
        ;;
      --target-db)
        TARGET_DB_OVERRIDE="$2"; shift 2
        ;;
      *)
        log_warning "Unknown option: $1"
        shift
        ;;
    esac
  done
}


# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }

# Database connection strings - base URI comes from env; default placeholder will be reset after env load
MONGODB_BASE="${MONGODB_BASE_URI:-mongodb+srv://username:password@portfolio-2025.p1lq6fs.mongodb.net}"

# Load environment variables from common .env files if not already set
load_env_if_needed() {
  if [[ -n "$MONGODB_BASE_URI" ]]; then
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
      # If we now have a non-placeholder value, stop searching
      if [[ -n "$MONGODB_BASE_URI" && "$MONGODB_BASE_URI" != *"username:password@"* ]]; then
        log_info "MONGODB_BASE_URI loaded from $f"
        break
      fi
    fi
  done
}

# Normalize a MongoDB base URI to ensure it has no trailing database name or query string.
# Examples:
#   mongodb+srv://user:pass@host/db?opts -> mongodb+srv://user:pass@host
#   mongodb://user:pass@host1,host2/db   -> mongodb://user:pass@host1,host2
normalize_base_uri() {
  local uri="$1"
  # Strip any path (database) and query after the host list
  echo "$uri" | sed -E 's#^(mongodb(\+srv)?://[^/]+)(/[^?]*)?(\?.*)?$#\1#'
}

# Determine if a base URI is a placeholder (i.e., not real credentials)
is_placeholder_uri() {
  local uri="$1"
  [[ "$uri" == *"username:password@"* ]]
}

# Get base URI for a specific environment; supports per-env override variables:
#   MONGODB_BASE_URI_LOCAL, MONGODB_BASE_URI_DEV, MONGODB_BASE_URI_PROD
# Falls back to MONGODB_BASE_URI when an override is not set.
get_base_uri_for_env() {
  local env_key="$1"
  local upper_env
  upper_env=$(echo "$env_key" | tr '[:lower:]' '[:upper:]')
  local var_name="MONGODB_BASE_URI_${upper_env}"
  local value="${!var_name}"
  if [[ -n "$value" ]]; then
    echo "$value"
  else
    echo "${MONGODB_BASE_URI}"
  fi
}

# Function to get database name by environment (supports per-env override)
# Overrides:
#   MONGODB_DB_NAME_LOCAL, MONGODB_DB_NAME_DEV, MONGODB_DB_NAME_PROD
# Defaults to "bb-portfolio-<env>"
get_db_name() {
  local env_key="$1"
  local upper_env
  upper_env=$(echo "$env_key" | tr '[:lower:]' '[:upper:]')
  local var_name="MONGODB_DB_NAME_${upper_env}"
  local override="${!var_name}"
  if [[ -n "$override" ]]; then
    echo "$override"
    return
  fi
  case "$env_key" in
    "local") echo "bb-portfolio-local" ;;
    "dev") echo "bb-portfolio-dev" ;;
    "prod") echo "bb-portfolio-prod" ;;
    *) echo "unknown" ;;
  esac
}

# Resolve DB name by environment with optional role-specific override
resolve_db_name() {
  local env_key="$1"   # local|dev|prod
  local role="$2"      # source|target
  if [[ "$role" == "source" && -n "$SOURCE_DB_OVERRIDE" ]]; then
    echo "$SOURCE_DB_OVERRIDE"; return
  fi
  if [[ "$role" == "target" && -n "$TARGET_DB_OVERRIDE" ]]; then
    echo "$TARGET_DB_OVERRIDE"; return
  fi
  get_db_name "$env_key"
}

# Function to get database URI by environment  
get_db_uri() {
  local env_key="$1"
  local db_name=$(get_db_name "$env_key")
  local base
  base=$(get_base_uri_for_env "$env_key")
  base=$(normalize_base_uri "$base")
  echo "${base}/${db_name}?retryWrites=true&w=majority&appName=bb-portfolio-2025"
}

# Function to check if MongoDB tools are installed
check_mongodb_tools() {
  if ! command -v mongodump &> /dev/null; then
    log_error "mongodump not found. Please install MongoDB Database Tools:"
    echo "  brew install mongodb/brew/mongodb-database-tools"
    exit 1
  fi
  
  if ! command -v mongorestore &> /dev/null; then
    log_error "mongorestore not found. Please install MongoDB Database Tools:"
    echo "  brew install mongodb/brew/mongodb-database-tools"
    exit 1
  fi
}

# Function to validate environment arguments
validate_environments() {
  local source_env=$1
  local target_env=$2
  
  if [[ -z "$source_env" || -z "$target_env" ]]; then
    log_error "Usage: $0 <source_env> <target_env>"
    echo "  Valid environments: local, dev, prod"
    echo "  Example: $0 local prod"
    exit 1
  fi
  
  if [[ "$(get_db_name $source_env)" == "unknown" ]]; then
    log_error "Invalid source environment: $source_env"
    echo "  Valid environments: local, dev, prod"
    exit 1
  fi
  
  if [[ "$(get_db_name $target_env)" == "unknown" ]]; then
    log_error "Invalid target environment: $target_env"
    echo "  Valid environments: local, dev, prod"
    exit 1
  fi
  
  if [[ "$source_env" == "$target_env" ]]; then
    # Allow same environment only when overriding DB names and they differ
    if [[ -n "$SOURCE_DB_OVERRIDE" || -n "$TARGET_DB_OVERRIDE" ]]; then
      local sdb tdb
      sdb=${SOURCE_DB_OVERRIDE:-$(get_db_name "$source_env")}
      tdb=${TARGET_DB_OVERRIDE:-$(get_db_name "$target_env")}
      if [[ "$sdb" == "$tdb" ]]; then
        log_error "When source and target environments are the same, --source-db and --target-db must be provided and different."
        exit 1
      fi
    else
      log_error "Source and target environments cannot be the same (provide --source-db and --target-db to rename within the same env)."
      exit 1
    fi
  fi
}

# Function to confirm destructive operation
confirm_migration() {
  local source_env=$1
  local target_env=$2
  local source_db_name=$(resolve_db_name "$source_env" source)
  local target_db_name=$(resolve_db_name "$target_env" target)
  
  echo
  log_warning "DESTRUCTIVE OPERATION WARNING"
  echo "  This will COMPLETELY REPLACE all data in: $target_db_name"
  echo "  With data from: $source_db_name"
  echo
  echo "  Collections that will be overwritten:"
  echo "    - projects"
  echo "    - projectThumbnails"  
  echo "    - projectScreenshots"
  echo "    - brandLogos"
  echo "    - clients"
  echo "    - users"
  echo "    - payload-preferences"
  echo "    - payload-migrations"
  echo
  
  if [[ "$target_env" == "prod" ]]; then
    log_error "⚠️  PRODUCTION DATABASE WILL BE OVERWRITTEN ⚠️"
    echo
  fi

  if [[ "$DRY_RUN" == "true" ]]; then
    log_info "Dry run mode enabled: no backup or restore will be executed."
    return
  fi

  if [[ "$ASSUME_YES" == "true" ]]; then
    log_info "--yes provided: skipping interactive confirmation."
    return
  fi

  # Read confirmation directly from the terminal to avoid stdin piping issues
  local confirmation
  if [[ -t 0 && -r /dev/tty ]]; then
    read -r -p "Are you sure you want to continue? (type 'yes' to confirm): " confirmation </dev/tty
  else
    read -r -p "Are you sure you want to continue? (type 'yes' to confirm): " confirmation
  fi
  if [[ "$confirmation" != "yes" ]]; then
    log_info "Migration cancelled."
    exit 0
  fi
}

# Function to create backup before migration
create_backup() {
  local target_env=$1
  local target_db_name=$(get_db_name $target_env)
  local target_db_uri=$(get_db_uri $target_env)
  local backup_dir="data/database-backups/$(date +%Y%m%d_%H%M%S)_${target_env}_backup"
  
  if [[ "$DRY_RUN" == "true" || "$NO_BACKUP" == "true" ]]; then
    log_warning "Skipping target backup (${target_db_name}) due to ${DRY_RUN:+--dry-run }${NO_BACKUP:+--no-backup}."
    return
  fi

  log_info "Creating backup of target database: $target_db_name"
  
  mkdir -p "$backup_dir"
  
  mongodump \
    --uri "$target_db_uri" \
    --out "$backup_dir" \
    ${QUIET_FLAG:+$QUIET_FLAG} </dev/null
  
  log_success "Backup created: $backup_dir"
  echo "  Use this to restore if needed:"
  echo "  mongorestore --uri \"$target_db_uri\" --drop \"$backup_dir/$target_db_name\""
  echo
}

# Main migration function
migrate_database() {
  local source_env=$1
  local target_env=$2
  local source_db_name=$(resolve_db_name "$source_env" source)
  local target_db_name=$(resolve_db_name "$target_env" target)
  local source_base target_base
  source_base=$(normalize_base_uri "$(get_base_uri_for_env "$source_env")")
  target_base=$(normalize_base_uri "$(get_base_uri_for_env "$target_env")")
  local source_db_uri="${source_base}/${source_db_name}?retryWrites=true&w=majority&appName=bb-portfolio-2025"
  local target_db_uri="${target_base}/${target_db_name}?retryWrites=true&w=majority&appName=bb-portfolio-2025"
  local temp_dump_dir="./temp_dump_$$"
  
  log_info "Starting database migration: $source_db_name → $target_db_name"
  if [[ "$DRY_RUN" == "true" ]]; then
    echo
    log_info "Plan (no actions will be performed):"
    echo "  Source URI: $(mask_uri "$source_db_uri")"
    echo "  Target URI: $(mask_uri "$target_db_uri")"
    echo "  Will run: mongodump --uri \"$source_db_uri\" --out \"$temp_dump_dir\" ${QUIET_FLAG:+$QUIET_FLAG}"
    echo "  Then:     mongorestore --uri \"$target_db_uri\" --drop --nsFrom \"<dumped-db>.*\" --nsTo \"${target_db_name}.*\" \"$temp_dump_dir/<dumped-db>\" ${QUIET_FLAG:+$QUIET_FLAG}"
    echo
    return
  fi
  
  # Step 1: Dump source database
  log_info "Step 1: Dumping source database ($source_db_name)"
  mkdir -p "$temp_dump_dir"
  # Capture mongodump errors for diagnostics
  local dump_log
  dump_log=$(mktemp -t mongodump.XXXXXX)
  if ! mongodump \
    --uri "$source_db_uri" \
    --out "$temp_dump_dir" \
    ${QUIET_FLAG:+$QUIET_FLAG} </dev/null 2>"$dump_log"; then
      log_error "mongodump failed. Last lines from dump log:"
      tail -n 50 "$dump_log"
      rm -f "$dump_log"
      exit 1
  fi

  # Determine actual dump directory name (some versions may not match the db name exactly)
  local source_dump_dir
  source_dump_dir=$(find "$temp_dump_dir" -mindepth 1 -maxdepth 1 -type d | head -n 1)
  # If no directory, check if any data files were produced
  if [[ -z "$source_dump_dir" || ! -d "$source_dump_dir" ]]; then
    # Check for any BSON files just in case layout differs
    local dumped_count
    dumped_count=$(find "$temp_dump_dir" -type f -name '*.bson' | wc -l | tr -d ' ')
    if [[ "$dumped_count" == "0" ]]; then
      log_error "No collections were dumped from source database."
      log_info "Source URI: $(mask_uri "$source_db_uri")"
      echo "  Possible causes:"
      echo "   - Database '$source_db_name' does not exist or has no collections"
      echo "   - Insufficient permissions for the user"
      echo "   - Network/auth issues (see dump log below)"
      echo
      tail -n 50 "$dump_log"
      rm -f "$dump_log"
      exit 1
    fi
  fi
  rm -f "$dump_log"
  local source_dump_name
  source_dump_name=$(basename "$source_dump_dir")
  log_success "Source database dumped to: $temp_dump_dir (dir: $source_dump_name)"
  
  # Step 2: Restoring to target database  
  log_info "Step 2: Restoring to target database ($target_db_name)"
  # Map source DB namespace to target DB to ensure correct restore
  local restore_log
  restore_log=$(mktemp -t mongorestore.XXXXXX)
  if ! mongorestore \
    --uri "$target_db_uri" \
    --drop \
    --nsFrom "${source_dump_name}.*" \
    --nsTo "${target_db_name}.*" \
    "$source_dump_dir" \
    ${QUIET_FLAG:+$QUIET_FLAG} </dev/null 2>"$restore_log"; then
      log_error "mongorestore failed. Last lines from restore log:"
      tail -n 50 "$restore_log"
      rm -f "$restore_log"
      exit 1
  fi
  rm -f "$restore_log"
  
  log_success "Data restored to: $target_db_name"
  
  # Cleanup
  rm -rf "$temp_dump_dir"
  log_info "Temporary files cleaned up"
}

# Main script execution
main() {
  local source_env=$1
  local target_env=$2
  shift 2
  parse_flags "$@"
  # Enable verbose bash tracing if requested
  if [[ "$VERBOSE" == "true" ]]; then
    set -x
    QUIET_FLAG=
  fi
  
  echo "🔄 MongoDB Database Migration Tool"
  echo "=================================="
  echo
  # Attempt to load env from .env files if not provided
  load_env_if_needed
  # Re-evaluate base after potential env load
  MONGODB_BASE="${MONGODB_BASE_URI:-mongodb+srv://username:password@portfolio-2025.p1lq6fs.mongodb.net}"
  # Validate that real MongoDB base URIs are configured for source and target (skip check for dry-run)
  if [[ "$DRY_RUN" != "true" ]]; then
    local src_base tgt_base
    src_base=$(get_base_uri_for_env "$source_env")
    tgt_base=$(get_base_uri_for_env "$target_env")
    if is_placeholder_uri "$src_base"; then
      log_error "MONGODB_BASE_URI_${source_env^^} (or MONGODB_BASE_URI) is not set with real credentials for source."
      echo "  Set an environment-specific base URI or a default MONGODB_BASE_URI."
      echo "  Example: export MONGODB_BASE_URI_${source_env^^}=\"mongodb+srv://<user>:<pass>@<cluster-host>\""
      exit 1
    fi
    if is_placeholder_uri "$tgt_base"; then
      log_error "MONGODB_BASE_URI_${target_env^^} (or MONGODB_BASE_URI) is not set with real credentials for target."
      echo "  Set an environment-specific base URI or a default MONGODB_BASE_URI."
      echo "  Example: export MONGODB_BASE_URI_${target_env^^}=\"mongodb+srv://<user>:<pass>@<cluster-host>\""
      exit 1
    fi
  fi
  
  # Validation
  check_mongodb_tools
  validate_environments "$source_env" "$target_env"
  
  # Confirmation (handles dry-run printout)
  confirm_migration "$source_env" "$target_env"
  
  # Create backup of target (skipped in dry-run / when --no-backup)
  create_backup "$target_env"
  
  # Perform migration
  migrate_database "$source_env" "$target_env"
  
  echo
  if [[ "$DRY_RUN" == "true" ]]; then
    log_success "🧪 Dry run completed. No changes were made."
  else
    log_success "🎈 Migration completed successfully!"
    log_info "Next steps:"
    echo "  1. Test the target environment to verify data integrity"
    echo "  2. Deploy/restart applications if needed"
    
    if [[ "$target_env" == "prod" ]]; then
      echo "  3. Trigger production build to regenerate static pages"
    fi
  fi
}

# Run main function with all arguments
main "$@"