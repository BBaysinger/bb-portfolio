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

set -e  # Exit on error
# Flags (default values)
DRY_RUN=false
NO_BACKUP=false

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

# Database connection strings - Use environment variable
MONGODB_BASE="${MONGODB_BASE_URI:-mongodb+srv://username:password@portfolio-2025.p1lq6fs.mongodb.net}"

# Function to get database name by environment
get_db_name() {
  case $1 in
    "local") echo "bb-portfolio-local" ;;
    "dev") echo "bb-portfolio-dev" ;;
    "prod") echo "bb-portfolio-prod" ;;
    *) echo "unknown" ;;
  esac
}

# Function to get database URI by environment  
get_db_uri() {
  local db_name=$(get_db_name $1)
  echo "${MONGODB_BASE}/${db_name}?retryWrites=true&w=majority&appName=bb-portfolio-2025"
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
    log_error "Source and target environments cannot be the same"
    exit 1
  fi
}

# Function to confirm destructive operation
confirm_migration() {
  local source_env=$1
  local target_env=$2
  local source_db_name=$(get_db_name $source_env)
  local target_db_name=$(get_db_name $target_env)
  
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

  read -p "Are you sure you want to continue? (type 'yes' to confirm): " confirmation
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
  local backup_dir="./database-backups/$(date +%Y%m%d_%H%M%S)_${target_env}_backup"
  
  if [[ "$DRY_RUN" == "true" || "$NO_BACKUP" == "true" ]]; then
    log_warning "Skipping target backup (${target_db_name}) due to ${DRY_RUN:+--dry-run }${NO_BACKUP:+--no-backup}."
    return
  fi

  log_info "Creating backup of target database: $target_db_name"
  
  mkdir -p "$backup_dir"
  
  mongodump \
    --uri "$target_db_uri" \
    --out "$backup_dir" \
    --quiet
  
  log_success "Backup created: $backup_dir"
  echo "  Use this to restore if needed:"
  echo "  mongorestore --uri \"$target_db_uri\" --drop \"$backup_dir/$target_db_name\""
  echo
}

# Main migration function
migrate_database() {
  local source_env=$1
  local target_env=$2
  local source_db_name=$(get_db_name $source_env)
  local target_db_name=$(get_db_name $target_env)
  local source_db_uri=$(get_db_uri $source_env)
  local target_db_uri=$(get_db_uri $target_env)
  local temp_dump_dir="./temp_dump_$$"
  
  log_info "Starting database migration: $source_db_name → $target_db_name"
  if [[ "$DRY_RUN" == "true" ]]; then
    echo
    log_info "Plan (no actions will be performed):"
    echo "  Source URI: $(mask_uri "$source_db_uri")"
    echo "  Target URI: $(mask_uri "$target_db_uri")"
    echo "  Will run: mongodump --uri \"$source_db_uri\" --out \"$temp_dump_dir\" --quiet"
    echo "  Then:     mongorestore --uri \"$target_db_uri\" --drop \"$temp_dump_dir/$source_db_name\" --quiet"
    echo
    return
  fi
  
  # Step 1: Dump source database
  log_info "Step 1: Dumping source database ($source_db_name)"
  mkdir -p "$temp_dump_dir"
  
  mongodump \
    --uri "$source_db_uri" \
    --out "$temp_dump_dir" \
    --quiet
  
  log_success "Source database dumped to: $temp_dump_dir"
  
  # Step 2: Restore to target database  
  log_info "Step 2: Restoring to target database ($target_db_name)"
  
  mongorestore \
    --uri "$target_db_uri" \
    --drop \
    "$temp_dump_dir/$source_db_name" \
    --quiet
  
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
  
  echo "🔄 MongoDB Database Migration Tool"
  echo "=================================="
  echo
  
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
  log_success "🎈 Migration completed successfully!"
  log_info "Next steps:"
  echo "  1. Test the target environment to verify data integrity"
  echo "  2. Deploy/restart applications if needed"
  
  if [[ "$target_env" == "prod" ]]; then
    echo "  3. Trigger production build to regenerate static pages"
  fi
}

# Run main function with all arguments
main "$@"