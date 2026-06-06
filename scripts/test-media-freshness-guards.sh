#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
SNAPSHOT_ROOT="${REPO_ROOT}/../cms-snapshots/test-media-freshness"
SEED_ROOT_DEFAULT="${SNAPSHOT_ROOT}/project-thumbnails"
BACKEND_THUMBS_DIR="${REPO_ROOT}/backend/media/project-thumbnails"

TMP_PREFIX="__media-guard-smoke-$$"
SEED_CONFLICT_BASENAME="${TMP_PREFIX}-seed.webp"
UPLOAD_CONFLICT_BASENAME="${TMP_PREFIX}-upload.webp"

cleanup() {
  rm -f \
    "${BACKEND_THUMBS_DIR}/${SEED_CONFLICT_BASENAME}" \
    "${BACKEND_THUMBS_DIR}/${UPLOAD_CONFLICT_BASENAME}" \
    "${SEED_ROOT_DEFAULT}/${SEED_CONFLICT_BASENAME}" \
    "${SEED_ROOT_DEFAULT}/${UPLOAD_CONFLICT_BASENAME}"
}

export CMS_SNAPSHOT_ROOT="$SNAPSHOT_ROOT"
mkdir -p "$SEED_ROOT_DEFAULT"

trap cleanup EXIT

cd "$REPO_ROOT"

cleanup

echo "[media-guard-smoke] Verifying clean-state success path"
npm run media:import -- --collection project-thumbnails >/tmp/${TMP_PREFIX}-seed-clean.log 2>&1
npm run media:upload:dev:dry -- --collection project-thumbnails >/tmp/${TMP_PREFIX}-upload-clean.log 2>&1

echo "[media-guard-smoke] Verifying media:import rejects older cms-snapshot content"
cp "${BACKEND_THUMBS_DIR}/portfolio.webp" "${BACKEND_THUMBS_DIR}/${SEED_CONFLICT_BASENAME}"
cp "${REPO_ROOT}/frontend/public/images/social/portfolio-share.png" "${SEED_ROOT_DEFAULT}/${SEED_CONFLICT_BASENAME}"
touch -t 202606042300 "${BACKEND_THUMBS_DIR}/${SEED_CONFLICT_BASENAME}"
touch -t 202606042200 "${SEED_ROOT_DEFAULT}/${SEED_CONFLICT_BASENAME}"

if npm run media:import -- --collection project-thumbnails >/tmp/${TMP_PREFIX}-seed-conflict.log 2>&1; then
  cat /tmp/${TMP_PREFIX}-seed-conflict.log
  echo "[media-guard-smoke] Expected media:import to fail on stale cms-snapshot overwrite" >&2
  exit 1
fi

rg -q "Refusing media:import because an older cms-snapshot file would overwrite newer backend/media state\." "/tmp/${TMP_PREFIX}-seed-conflict.log"
rm -f "${BACKEND_THUMBS_DIR}/${SEED_CONFLICT_BASENAME}" "${SEED_ROOT_DEFAULT}/${SEED_CONFLICT_BASENAME}"

echo "[media-guard-smoke] Verifying media:upload rejects older backend/media state"
cp "${REPO_ROOT}/frontend/public/images/social/portfolio-share.png" "${BACKEND_THUMBS_DIR}/${UPLOAD_CONFLICT_BASENAME}"
cp "${BACKEND_THUMBS_DIR}/portfolio.webp" "${SEED_ROOT_DEFAULT}/${UPLOAD_CONFLICT_BASENAME}"
touch -t 202606042200 "${BACKEND_THUMBS_DIR}/${UPLOAD_CONFLICT_BASENAME}"
touch -t 202606042300 "${SEED_ROOT_DEFAULT}/${UPLOAD_CONFLICT_BASENAME}"

if npm run media:upload:dev:dry -- --collection project-thumbnails >/tmp/${TMP_PREFIX}-upload-conflict.log 2>&1; then
  cat /tmp/${TMP_PREFIX}-upload-conflict.log
  echo "[media-guard-smoke] Expected media:upload:dev:dry to fail on stale backend/media overwrite" >&2
  exit 1
fi

rg -q "Refusing media upload because backend/media contains older overlapping files than the snapshot root\." "/tmp/${TMP_PREFIX}-upload-conflict.log"
rm -f "${BACKEND_THUMBS_DIR}/${UPLOAD_CONFLICT_BASENAME}" "${SEED_ROOT_DEFAULT}/${UPLOAD_CONFLICT_BASENAME}"

echo "[media-guard-smoke] Passed"
