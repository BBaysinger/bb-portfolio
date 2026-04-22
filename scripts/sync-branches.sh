#!/usr/bin/env bash
# Sync dev and main branches, then bump the canonical repo patch version on dev:
# - First, keep existing branch alignment behavior between dev and main
# - Then increment the root package version once, copy it to child packages, sync JSON5 mirrors, commit on dev
# - Finally fast-forward main to the new version-bump commit and push both branches
# - Always ends on dev (even on failure it will attempt to switch back)
#
# Usage: npm run sync:branches

set -euo pipefail

log() { echo -e "\033[1;34m[sync-branches]\033[0m $*"; }
err() { echo -e "\033[1;31m[sync-branches]\033[0m $*" 1>&2; }

# Ensure we're in a git repo
if ! git rev-parse --show-toplevel >/dev/null 2>&1; then
  err "Not a git repository."
  exit 1
fi

START_BRANCH=$(git rev-parse --abbrev-ref HEAD)
log "Starting on branch: $START_BRANCH"

# Always attempt to return to dev on exit
cleanup() {
  set +e
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
  MERGE1_FROM=dev   # dev -> main
  MERGE1_TO=main
  MERGE2_FROM=main  # main -> dev
  MERGE2_TO=dev
elif [[ "$START_BRANCH" == "main" ]]; then
  FIRST=dev
  SECOND=main
  MERGE1_FROM=main  # main -> dev
  MERGE1_TO=dev
  MERGE2_FROM=dev   # dev -> main
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

# Sequence
checkout_ff_pull "$FIRST"
merge_local "$MERGE1_FROM" "$MERGE1_TO"
checkout_ff_pull "$SECOND"
merge_local "$MERGE2_FROM" "$MERGE2_TO"

log "Branch histories synchronized. Switching to dev for version bump."
git checkout dev
log "Bumping canonical repo version on dev."

log "Incrementing root package version and propagating to backend/frontend"
npm run version:bump:sync
log "Syncing package.json5 mirrors"
npm run sync:packages

NEW_VERSION=$(node -p "require('./package.json').version")
log "Committing version bump $NEW_VERSION on dev"
git add package.json package.json5 package-lock.json \
  backend/package.json backend/package.json5 backend/package-lock.json \
  frontend/package.json frontend/package.json5 frontend/package-lock.json
git commit -m "Bump version to $NEW_VERSION"

log "Fast-forwarding main to version bump $NEW_VERSION"
merge_local dev main

log "Pushing dev once"
git push origin dev

log "Pushing main once"
git checkout main
git push origin main

log "Returning to dev."
git checkout dev
log "Done."
