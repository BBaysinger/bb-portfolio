#!/usr/bin/env bash

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CONTENT_DIR_RAW=""
CANONICAL_CONTENT_DIR_RAW=""
CONTENT_DIR_SOURCE=""

load_content_dir_from_env_file() {
  local env_file="$1"

  [[ -f "$env_file" ]] || return 1

  while IFS= read -r line || [[ -n "$line" ]]; do
    local trimmed="${line#"${line%%[![:space:]]*}"}"

    [[ -z "$trimmed" || "$trimmed" == \#* ]] && continue
    [[ "$trimmed" == export\ * ]] && trimmed="${trimmed#export }"

    if [[ "$trimmed" == PORTFOLIO_CONTENT_DIR=* ]]; then
      local value="${trimmed#PORTFOLIO_CONTENT_DIR=}"
      value="${value%$'\r'}"

      if [[ "$value" == \"*\" && "$value" == *\" ]]; then
        value="${value:1:${#value}-2}"
      elif [[ "$value" == \'*\' ]]; then
        value="${value:1:${#value}-2}"
      fi

      CONTENT_DIR_RAW="$value"
      return 0
    fi
  done <"$env_file"

  return 1
}

load_canonical_content_dir_from_files() {
  load_content_dir_from_env_file "$REPO_ROOT/.env.local" || true
  if [[ -n "$CONTENT_DIR_RAW" ]]; then
    CANONICAL_CONTENT_DIR_RAW="$CONTENT_DIR_RAW"
    CONTENT_DIR_RAW=""
    return 0
  fi

  load_content_dir_from_env_file "$REPO_ROOT/.env" || true
  if [[ -n "$CONTENT_DIR_RAW" ]]; then
    CANONICAL_CONTENT_DIR_RAW="$CONTENT_DIR_RAW"
    CONTENT_DIR_RAW=""
    return 0
  fi

  load_content_dir_from_env_file "$REPO_ROOT/backend/.env.local" || true
  if [[ -n "$CONTENT_DIR_RAW" ]]; then
    CANONICAL_CONTENT_DIR_RAW="$CONTENT_DIR_RAW"
    CONTENT_DIR_RAW=""
    return 0
  fi

  load_content_dir_from_env_file "$REPO_ROOT/backend/.env" || true
  if [[ -n "$CONTENT_DIR_RAW" ]]; then
    CANONICAL_CONTENT_DIR_RAW="$CONTENT_DIR_RAW"
    CONTENT_DIR_RAW=""
    return 0
  fi

  return 1
}

load_canonical_content_dir_from_files || true

if [[ -n "${PORTFOLIO_CONTENT_DIR:-}" ]]; then
  CONTENT_DIR_RAW="$PORTFOLIO_CONTENT_DIR"
  CONTENT_DIR_SOURCE="explicit-env"
elif [[ -n "$CANONICAL_CONTENT_DIR_RAW" ]]; then
  CONTENT_DIR_RAW="$CANONICAL_CONTENT_DIR_RAW"
  CONTENT_DIR_SOURCE="env-file"
fi

if [[ -z "$CONTENT_DIR_RAW" ]]; then
  echo "Set PORTFOLIO_CONTENT_DIR in repo .env.local/.env or backend .env.local/.env." >&2
  echo "Example (.env.local): PORTFOLIO_CONTENT_DIR=../cms-content-variants/<target>" >&2
  exit 1
fi

if [[ "$CONTENT_DIR_RAW" = /* ]]; then
  RESOLVED_CONTENT_DIR="$CONTENT_DIR_RAW"
else
  RESOLVED_CONTENT_DIR="$REPO_ROOT/$CONTENT_DIR_RAW"
fi

if [[ ! -d "$RESOLVED_CONTENT_DIR" ]]; then
  echo "PORTFOLIO_CONTENT_DIR points to a missing directory: $RESOLVED_CONTENT_DIR" >&2
  exit 1
fi

export PORTFOLIO_CONTENT_DIR="$CONTENT_DIR_RAW"
export PORTFOLIO_CONTENT_DIR_SOURCE="$CONTENT_DIR_SOURCE"

if [[ -n "$CANONICAL_CONTENT_DIR_RAW" ]]; then
  export CANONICAL_PORTFOLIO_CONTENT_DIR="$CANONICAL_CONTENT_DIR_RAW"
fi

if [[ $# -eq 0 ]]; then
  echo "No command provided. Usage: scripts/with-portfolio-content-dir.sh <command...>" >&2
  exit 1
fi

exec "$@"
