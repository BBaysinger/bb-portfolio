#!/usr/bin/env bash
set -euo pipefail

OUT_DIR="${OUT_DIR:-$(mktemp -d)}"
PROFILES="${PROFILES:-prod,dev}"
TARGETS="${TARGETS:-backend,frontend}"

IFS=',' read -r -a RAW_PROFILES <<<"$PROFILES"
declare -a PROFILE_QUEUE=()
for raw in "${RAW_PROFILES[@]}"; do
  entry="${raw// /}"
  if [[ -z "$entry" ]]; then
    continue
  fi
  if [[ "$entry" == "both" ]]; then
    PROFILE_QUEUE+=(prod dev)
  else
    PROFILE_QUEUE+=("$entry")
  fi
done

if [[ ${#PROFILE_QUEUE[@]} -eq 0 ]]; then
  PROFILE_QUEUE=(prod dev)
fi

for profile in "${PROFILE_QUEUE[@]}"; do
  npx --yes tsx scripts/generate-env-files.ts --out "$OUT_DIR" --profiles "$profile" --targets "$TARGETS"
done

if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
  echo "dir=$OUT_DIR" >> "$GITHUB_OUTPUT"
else
  printf '%s\n' "dir=$OUT_DIR"
fi
