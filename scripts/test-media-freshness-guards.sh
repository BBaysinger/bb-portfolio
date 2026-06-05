#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
SEED_ROOT_DEFAULT="${REPO_ROOT}/../cms-media-seedings/project-thumbnails"
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

trap cleanup EXIT

cd "$REPO_ROOT"

cleanup

echo "[media-guard-smoke] Verifying clean-state success path"
npm run media:seed -- --collection project-thumbnails >/tmp/${TMP_PREFIX}-seed-clean.log 2>&1
npm run media:upload:dev:dry -- --collection project-thumbnails >/tmp/${TMP_PREFIX}-upload-clean.log 2>&1

echo "[media-guard-smoke] Verifying media:seed rejects older snapshot content"
cp "${BACKEND_THUMBS_DIR}/portfolio.webp" "${BACKEND_THUMBS_DIR}/${SEED_CONFLICT_BASENAME}"
cp "${REPO_ROOT}/frontend/public/images/social/portfolio-share.png" "${SEED_ROOT_DEFAULT}/${SEED_CONFLICT_BASENAME}"
touch -t 202606042300 "${BACKEND_THUMBS_DIR}/${SEED_CONFLICT_BASENAME}"
touch -t 202606042200 "${SEED_ROOT_DEFAULT}/${SEED_CONFLICT_BASENAME}"

if npm run media:seed -- --collection project-thumbnails >/tmp/${TMP_PREFIX}-seed-conflict.log 2>&1; then
  cat /tmp/${TMP_PREFIX}-seed-conflict.log
  echo "[media-guard-smoke] Expected media:seed to fail on stale snapshot overwrite" >&2
  exit 1
fi

rg -q "Refusing media:seed because an older local seedings file would overwrite newer backend/media state\." "/tmp/${TMP_PREFIX}-seed-conflict.log"
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
