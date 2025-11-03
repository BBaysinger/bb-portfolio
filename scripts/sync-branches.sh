#!/usr/bin/env bash
# Sync dev and main branches:
# - If on dev: switch to main, merge dev->main, push main, switch to dev, merge main->dev, push dev
# - If on main: switch to dev, merge main->dev, push dev, switch to main, merge dev->main, push main
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

# Helper: checkout, fast-forward pull, merge, push
checkout_ff_pull() {
  local BR=$1
  log "Checking out $BR"
  git checkout "$BR"
  log "Pulling latest origin/$BR (ff-only)"
  git pull --ff-only origin "$BR" || {
    err "Fast-forward pull failed on $BR. Resolve manually (rebase/merge) then rerun."
    exit 1
  }
}

merge_push() {
  local FROM=$1
  local TO=$2
  log "Merging $FROM into $TO"
  git checkout "$TO"
  # Ensure TO is up to date
  git pull --ff-only origin "$TO" || {
    err "Fast-forward pull failed on $TO. Resolve manually then rerun."
    exit 1
  }
  if git merge --no-ff "$FROM" -m "chore(sync-branches): merge $FROM into $TO"; then
    log "Pushing $TO to origin"
    git push origin "$TO"
  else
    err "Merge conflict merging $FROM into $TO. Fix conflicts, commit, and push manually."
    exit 1
  fi
}

# Sequence
checkout_ff_pull "$FIRST"
merge_push "$MERGE1_FROM" "$MERGE1_TO"
checkout_ff_pull "$SECOND"
merge_push "$MERGE2_FROM" "$MERGE2_TO"

log "Branches synchronized. Returning to dev."
git checkout dev
log "Done."
