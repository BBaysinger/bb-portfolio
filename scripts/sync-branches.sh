#!/usr/bin/env bash
# Sync dev and main branches, then drive either a staged release flow or the
# legacy deploy-all flow:
# - First, keep existing branch alignment behavior between dev and main
# - Default flow: push current dev, wait for a successful dev deploy, then bump
#   versions locally, deploy main with that version, and finally fast-forward
#   dev to the same version-bump commit without running a second dev deploy
# - Override flow: preserve the prior behavior and deploy the version-bump push
#   on both dev and main
# - Always ends on dev (even on failure it will attempt to switch back)
#
# Usage:
#   npm run release:promote
#   npm run release:promote -- --no-version-bump
#   npm run release:promote -- --deploy-all

set -euo pipefail

log() { echo -e "\033[1;34m[sync-branches]\033[0m $*"; }
err() { echo -e "\033[1;31m[sync-branches]\033[0m $*" 1>&2; }

print_usage() {
  cat <<'EOF'
Usage: npm run release:promote [-- --no-version-bump] [--deploy-all]

Options:
  --no-version-bump  Sync branches without incrementing package versions.
  --deploy-all       Use the legacy flow: bump once, then push/deploy both dev and main.
  -h, --help         Show this help text.
EOF
}

SKIP_VERSION_BUMP=false
DEPLOY_ALL=false
CI_WORKFLOW_FILE=".github/workflows/ci-cd.yml"
DEV_SKIP_DEPLOY_TOKEN="[skip dev deploy]"
DEV_SKIP_CI_TOKEN="[skip ci]"

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
  local RUN_ID=""
  local ATTEMPTS=0

  require_gh

  log "Waiting for CI/CD workflow to start for $LABEL ($SHA)"
  until [[ -n "$RUN_ID" ]]; do
    RUN_ID=$(gh run list \
      --workflow "$CI_WORKFLOW_FILE" \
      --branch "$BRANCH" \
      --event push \
      --limit 20 \
      --json databaseId,headSha \
      --jq ".[] | select(.headSha == \"$SHA\") | .databaseId" | head -n 1)

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

create_version_bump_commit() {
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
  VERSION_BUMP_MESSAGE="Bump version to $NEW_VERSION"
  git commit -m "$VERSION_BUMP_MESSAGE"
}

create_dev_sync_skip_commit() {
  NEW_VERSION=$(node -p "require('./package.json').version")
  SYNC_MESSAGE="Sync dev to main after release $NEW_VERSION $DEV_SKIP_CI_TOKEN $DEV_SKIP_DEPLOY_TOKEN"
  log "Creating dev-only sync marker commit to suppress the final dev workflow run"
  git commit --allow-empty -m "$SYNC_MESSAGE"
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
  log "Pushing dev once"
  git push origin dev

  log "Pushing main once"
  git checkout main
  git push origin main
elif [[ "$DEPLOY_ALL" == true ]]; then
  create_version_bump_commit

  log "Fast-forwarding main to current dev state"
  merge_local dev main

  log "Pushing dev once"
  git push origin dev

  log "Pushing main once"
  git checkout main
  git push origin main
else
  DEV_SYNC_SHA=$(git rev-parse dev)
  log "Pushing dev before version bump"
  git push origin dev
  wait_for_push_workflow dev "$DEV_SYNC_SHA" "dev pre-version deploy"

  create_version_bump_commit

  log "Fast-forwarding main to current dev state"
  merge_local dev main

  MAIN_BUMP_SHA=$(git rev-parse main)
  log "Pushing main with version bump"
  git checkout main
  git push origin main
  wait_for_push_workflow main "$MAIN_BUMP_SHA" "main version deploy"

  create_dev_sync_skip_commit

  log "Pushing dev sync commit without rerunning CI/CD or dev deploy"
  git checkout dev
  git push origin dev
fi

log "Returning to dev."
git checkout dev
log "Done."
