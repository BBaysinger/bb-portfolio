#!/usr/bin/env bash
set -euo pipefail

OUT_DIR="${OUT_DIR:-$(mktemp -d)}"
PROFILES="${PROFILES:-prod,dev}"
TARGETS="${TARGETS:-backend,frontend}"

npx --yes tsx scripts/generate-env-files.ts --out "$OUT_DIR" --profiles "$PROFILES" --targets "$TARGETS"

if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
  echo "dir=$OUT_DIR" >> "$GITHUB_OUTPUT"
else
  printf '%s\n' "dir=$OUT_DIR"
fi
