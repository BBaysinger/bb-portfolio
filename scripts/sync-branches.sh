#!/usr/bin/env bash
# Sync dev and main branches, then drive either a staged release flow or the
# legacy deploy-all flow:
# - First, keep existing branch alignment behavior between dev and main
# - Default flow: push current dev, wait for a successful dev deploy, then bump
#   versions locally, deploy main with that version, and finally fast-forward
#   dev to the same released commit only when origin/dev has not advanced in
#   the meantime
# - Override flow: preserve the prior behavior and deploy the version-bump push
#   on both dev and main
# - Always ends on dev (even on failure it will attempt to switch back)
#
# Usage:
#   npm run release:promote
#   npm run release:sync-only
#   npm run release:promote -- --deploy-all

set -euo pipefail

log() { echo -e "\033[1;34m[sync-branches]\033[0m $*"; }
err() { echo -e "\033[1;31m[sync-branches]\033[0m $*" 1>&2; }

print_usage() {
  cat <<'EOF'
Usage: npm run release:promote | npm run release:sync-only | npm run release:promote -- --deploy-all

Options:
  --no-version-bump  Sync branches without incrementing package versions.
  --deploy-all       Use the legacy flow: bump once, then push/deploy both dev and main.
  -h, --help         Show this help text.
EOF
}

SKIP_VERSION_BUMP=false
DEPLOY_ALL=false
CI_WORKFLOW_FILE=".github/workflows/ci-cd.yml"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --no-version-bump)
      SKIP_VERSION_BUMP=true
      shift
      ;;
    --deploy-all)
      DEPLOY_ALL=true
      shift
      ;;
    -h | --help)
      print_usage
      exit 0
      ;;
    *)
      err "Unknown option: $1"
      print_usage
      exit 1
      ;;
  esac
done

# Ensure we're in a git repo
if ! git rev-parse --show-toplevel >/dev/null 2>&1; then
  err "Not a git repository."
  exit 1
fi

# Local-only guard: blocks overlapping release:promote runs in this repo clone.
# This is intentionally scoped to the single-developer workflow for this repo;
# it is not a cross-machine or cross-clone release lock.
LOCK_DIR="$(git rev-parse --git-path release-promote.lock)"
LOCK_ACQUIRED=false

acquire_release_lock() {
  if mkdir "$LOCK_DIR" 2>/dev/null; then
    printf '%s\n' "$$" >"$LOCK_DIR/pid"
    LOCK_ACQUIRED=true
    return 0
  fi

  local existing_pid=""
  if [[ -f "$LOCK_DIR/pid" ]]; then
    existing_pid="$(cat "$LOCK_DIR/pid" 2>/dev/null || true)"
  fi

  if [[ -n "$existing_pid" ]] && kill -0 "$existing_pid" 2>/dev/null; then
    err "release:promote is already running in this repo clone (pid $existing_pid). Wait for it to finish before starting another release."
    exit 1
  fi

  err "Found a stale release lock. Removing it and retrying."
  rm -rf "$LOCK_DIR"

  if mkdir "$LOCK_DIR" 2>/dev/null; then
    printf '%s\n' "$$" >"$LOCK_DIR/pid"
    LOCK_ACQUIRED=true
    return 0
  fi

  err "Unable to acquire release lock at $LOCK_DIR. Resolve manually and rerun."
  exit 1
}

START_BRANCH=$(git rev-parse --abbrev-ref HEAD)
log "Starting on branch: $START_BRANCH"

acquire_release_lock

# Always attempt to return to dev on exit
cleanup() {
  set +e
  if [[ "$LOCK_ACQUIRED" == true ]]; then
    rm -rf "$LOCK_DIR"
  fi
  if git rev-parse --verify dev >/dev/null 2>&1; then
    git checkout dev >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

# Require clean working tree
if [[ -n "$(git status --porcelain)" ]]; then
  err "Working tree has uncommitted changes. Commit or stash before running."
  exit 1
fi

# Ensure remotes are up to date
log "Fetching origin..."
git fetch --all --prune

# Ensure local branches exist tracking origin
ensure_local_branch() {
  local BR=$1
  if ! git show-ref --verify --quiet "refs/heads/$BR"; then
    if git show-ref --verify --quiet "refs/remotes/origin/$BR"; then
      log "Creating local $BR from origin/$BR"
      git branch --track "$BR" "origin/$BR"
    else
      err "Branch '$BR' does not exist locally or on origin. Aborting."
      exit 1
    fi
  fi
}

ensure_local_branch dev
ensure_local_branch main

# Decide sequence based on starting branch
if [[ "$START_BRANCH" == "dev" ]]; then
  FIRST=main
  SECOND=dev
  MERGE1_FROM=dev # dev -> main
  MERGE1_TO=main
  MERGE2_FROM=main # main -> dev
  MERGE2_TO=dev
elif [[ "$START_BRANCH" == "main" ]]; then
  FIRST=dev
  SECOND=main
  MERGE1_FROM=main # main -> dev
  MERGE1_TO=dev
  MERGE2_FROM=dev # dev -> main
  MERGE2_TO=main
else
  err "This script is intended to be run from 'dev' or 'main'. Current: '$START_BRANCH'"
  exit 1
fi

# Helper: checkout, fast-forward pull, merge locally
checkout_ff_pull() {
  local BR=$1
  log "Checking out $BR"
  git checkout "$BR"
  log "Fetching latest origin/$BR"
  git fetch origin "$BR" || {
    err "Fetch failed for $BR. Resolve remote issues then rerun."
    exit 1
  }
  log "Fast-forwarding $BR to origin/$BR"
  git merge --ff-only "origin/$BR" || {
    err "Fast-forward update failed on $BR. Resolve manually (rebase/merge) then rerun."
    exit 1
  }
}

merge_local() {
  local FROM=$1
  local TO=$2
  log "Merging $FROM into $TO"
  git checkout "$TO"
  # Ensure TO is up to date
  log "Fetching latest origin/$TO"
  git fetch origin "$TO" || {
    err "Fetch failed for $TO. Resolve remote issues then rerun."
    exit 1
  }
  log "Fast-forwarding $TO to origin/$TO"
  git merge --ff-only "origin/$TO" || {
    err "Fast-forward update failed on $TO. Resolve manually then rerun."
    exit 1
  }
  # Fast-forward only to keep linear history (no merge commits)
  if git merge --ff-only "$FROM"; then
    log "$TO now matches $FROM locally"
  else
    err "Non fast-forward merge required merging $FROM into $TO. To keep a single-line history, resolve by rebasing or aligning branches (e.g., reset) and rerun."
    exit 1
  fi
}

push_ref_to_branch() {
  local SOURCE_REF=$1
  local DEST_BRANCH=$2

  log "Pushing $DEST_BRANCH from $SOURCE_REF"
  git push origin "$SOURCE_REF:$DEST_BRANCH"
}

require_gh() {
  if ! command -v gh >/dev/null 2>&1; then
    err "GitHub CLI (gh) is required for release:promote orchestration."
    exit 1
  fi

  if ! gh auth status >/dev/null 2>&1; then
    err "GitHub CLI is not authenticated. Run 'gh auth login' and rerun."
    exit 1
  fi
}

wait_for_push_workflow() {
  local BRANCH=$1
  local SHA=$2
  local LABEL=$3
  local EVENT=${4:-push}
  local STARTED_AT=${5:-}
  local CREATED_FILTER=""
  local RUN_ID=""
  local ATTEMPTS=0

  require_gh

  if [[ -n "$STARTED_AT" ]]; then
    CREATED_FILTER=" and .createdAt >= \"$STARTED_AT\""
  fi

  log "Waiting for CI/CD workflow to start for $LABEL ($SHA via $EVENT)"
  until [[ -n "$RUN_ID" ]]; do
    RUN_ID=$(gh run list \
      --workflow "$CI_WORKFLOW_FILE" \
      --branch "$BRANCH" \
      --event "$EVENT" \
      --limit 20 \
      --json databaseId,headSha,createdAt \
      --jq ".[] | select(.headSha == \"$SHA\"$CREATED_FILTER) | .databaseId" | head -n 1)

    if [[ -n "$RUN_ID" ]]; then
      break
    fi

    ATTEMPTS=$((ATTEMPTS + 1))
    if [[ $ATTEMPTS -ge 30 ]]; then
      err "Timed out waiting for CI/CD workflow on $BRANCH for $SHA."
      exit 1
    fi

    sleep 10
  done

  log "Watching CI/CD workflow run $RUN_ID for $LABEL"
  if ! gh run watch "$RUN_ID" --exit-status; then
    err "CI/CD workflow failed for $LABEL."
    gh run view "$RUN_ID" --log || true
    exit 1
  fi
}

current_timestamp_utc() {
  date -u +"%Y-%m-%dT%H:%M:%SZ"
}

remote_branch_sha() {
  local BRANCH=$1

  git ls-remote --heads origin "$BRANCH" | awk 'NR==1 { print $1 }'
}

trigger_manual_workflow() {
  local BRANCH=$1
  local LABEL=$2

  require_gh
  log "Triggering CI/CD workflow manually for $LABEL on $BRANCH"
  gh workflow run "$CI_WORKFLOW_FILE" --ref "$BRANCH" >/dev/null
}

push_or_dispatch_workflow() {
  local SOURCE_REF=$1
  local DEST_BRANCH=$2
  local TARGET_SHA=$3
  local LABEL=$4
  local SHOULD_WAIT=${5:-false}
  local REMOTE_SHA=""
  local EVENT="push"
  local STARTED_AT=""

  REMOTE_SHA=$(remote_branch_sha "$DEST_BRANCH")
  STARTED_AT=$(current_timestamp_utc)

  if [[ "$REMOTE_SHA" == "$TARGET_SHA" ]]; then
    log "$DEST_BRANCH already points at $TARGET_SHA; using workflow_dispatch for $LABEL"
    trigger_manual_workflow "$DEST_BRANCH" "$LABEL"
    EVENT="workflow_dispatch"
  else
    if [[ "$SOURCE_REF" == "$DEST_BRANCH" ]]; then
      log "Pushing $DEST_BRANCH"
      git push origin "$DEST_BRANCH"
    else
      push_ref_to_branch "$SOURCE_REF" "$DEST_BRANCH"
    fi
  fi

  if [[ "$SHOULD_WAIT" == true ]]; then
    wait_for_push_workflow "$DEST_BRANCH" "$TARGET_SHA" "$LABEL" "$EVENT" "$STARTED_AT"
  fi
}

create_version_bump_commit() {
  log "Bumping canonical repo version on dev."

  log "Incrementing root package version and propagating to backend/frontend"
  npm run version:bump:sync
  log "Syncing package.json5 mirrors"
  npm run sync:json5

  NEW_VERSION=$(node -p "require('./package.json').version")
  log "Committing version bump $NEW_VERSION on dev"
  git add package.json package.json5 package-lock.json \
    backend/package.json backend/package.json5 backend/package-lock.json \
    frontend/package.json frontend/package.json5 frontend/package-lock.json
  VERSION_BUMP_MESSAGE="Bump version to $NEW_VERSION"
  git commit -m "$VERSION_BUMP_MESSAGE"
}

assert_remote_branch_sha() {
  local BRANCH=$1
  local EXPECTED_SHA=$2
  local CONTEXT=$3
  local ACTUAL_SHA=""

  ACTUAL_SHA=$(remote_branch_sha "$BRANCH")

  if [[ -z "$ACTUAL_SHA" ]]; then
    err "Unable to resolve origin/$BRANCH while $CONTEXT. Aborting."
    exit 1
  fi

  if [[ "$ACTUAL_SHA" != "$EXPECTED_SHA" ]]; then
    err "origin/$BRANCH moved during $CONTEXT. Expected $EXPECTED_SHA but found $ACTUAL_SHA. Aborting to avoid rewriting newer work."
    exit 1
  fi
}

# Sequence
checkout_ff_pull "$FIRST"
merge_local "$MERGE1_FROM" "$MERGE1_TO"
checkout_ff_pull "$SECOND"
merge_local "$MERGE2_FROM" "$MERGE2_TO"

log "Branch histories synchronized. Switching to dev."
git checkout dev

if [[ "$SKIP_VERSION_BUMP" == true ]]; then
  log "Skipping version bump; syncing main to current dev state."
fi

if [[ "$SKIP_VERSION_BUMP" == true ]]; then
  DEV_SYNC_SHA=$(git rev-parse dev)
  push_or_dispatch_workflow dev dev "$DEV_SYNC_SHA" "dev sync-only deploy"

  push_or_dispatch_workflow dev main "$DEV_SYNC_SHA" "main sync-only deploy"
  checkout_ff_pull main
elif [[ "$DEPLOY_ALL" == true ]]; then
  create_version_bump_commit

  DEPLOY_ALL_SHA=$(git rev-parse dev)
  push_or_dispatch_workflow dev dev "$DEPLOY_ALL_SHA" "dev deploy-all deploy"

  push_or_dispatch_workflow dev main "$DEPLOY_ALL_SHA" "main deploy-all deploy"
  checkout_ff_pull main
else
  DEV_SYNC_SHA=$(git rev-parse dev)
  push_or_dispatch_workflow dev dev "$DEV_SYNC_SHA" "dev pre-version deploy" true

  create_version_bump_commit

  MAIN_BUMP_SHA=$(git rev-parse dev)
  push_or_dispatch_workflow dev main "$MAIN_BUMP_SHA" "main version deploy" true
  checkout_ff_pull main

  log "Verifying origin/dev still matches the pre-release dev commit before final sync"
  assert_remote_branch_sha dev "$DEV_SYNC_SHA" "the post-release dev sync"

  log "Fast-forwarding dev to the released main commit"
  git checkout dev
  git merge --ff-only main

  log "Pushing dev to the released main commit; CI will skip the redundant final dev run when dev matches main"
  git push origin dev
fi

log "Returning to dev."
git checkout dev
log "Done."
