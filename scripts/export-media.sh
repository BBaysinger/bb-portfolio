#!/usr/bin/env bash
set -euo pipefail

# Export PSDs from ../_work/{project-screenshots,project-thumbnails}
# into WebP files written under ../cms-seedings/{project-screenshots,project-thumbnails}.
# This script is location-independent and resolves all paths relative to the repo root.

# Resolve directories
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Input base: sibling to repo -> ../_work (absolute)
WORK_BASE="$(cd "${REPO_DIR}/../_work" 2>/dev/null && pwd || true)"
if [[ -z "$WORK_BASE" || ! -d "$WORK_BASE" ]]; then
  echo "Error: Input base folder not found: ${REPO_DIR}/../_work" >&2
  echo "Expected PSDs in: ../_work/{project-screenshots,project-thumbnails} relative to repo root." >&2
  exit 2
fi

# Output base: sibling to repo -> ../cms-seedings (absolute)
SEED_BASE="$(cd "${REPO_DIR}/../cms-seedings" 2>/dev/null && pwd || true)"
if [[ -z "$SEED_BASE" ]]; then
  # If cms-seedings doesn't exist yet, create it
  SEED_BASE="${REPO_DIR}/../cms-seedings"
  mkdir -p "$SEED_BASE"
  SEED_BASE="$(cd "$SEED_BASE" && pwd)"
fi

# Subdirectories to process
SUBDIRS=(
  "project-screenshots"
  "project-thumbnails"
)

# Quality setting (0-100)
QUALITY="70"

# Verify ImageMagick is available (prefer v7 'magick mogrify', fallback to v6 'mogrify')
MOGRIFY_CMD=()
if command -v magick >/dev/null 2>&1; then
  MOGRIFY_CMD=(magick mogrify)
elif command -v mogrify >/dev/null 2>&1; then
  MOGRIFY_CMD=(mogrify)
else
  echo "Error: ImageMagick is not installed or not in PATH." >&2
  echo "Install via Homebrew: brew install imagemagick" >&2
  exit 1
fi

# Process each subdirectory
for SUB in "${SUBDIRS[@]}"; do
  INPUT_DIR="$WORK_BASE/$SUB"
  OUTPUT_DIR="$SEED_BASE/$SUB"
  # Skip missing input directories gracefully
  if [[ ! -d "$INPUT_DIR" ]]; then
    echo "Skipping missing directory: $INPUT_DIR"
    continue
  fi

  mkdir -p "$OUTPUT_DIR"
  echo "Converting $INPUT_DIR -> $OUTPUT_DIR"

  # Convert PSD (case-insensitive) to WebP into the same folder.
  # Use bracket expansion to support .psd and .PSD without enabling nocaseglob globally.
  shopt -s nullglob
  PSD_FILES=("$INPUT_DIR"/*.[Pp][Ss][Dd])
  if (( ${#PSD_FILES[@]} == 0 )); then
    echo "No PSD files found in $INPUT_DIR; nothing to convert."
    continue
  fi

  "${MOGRIFY_CMD[@]}" \
    -path "$OUTPUT_DIR" \
    -format webp \
    -quality "$QUALITY" \
    "${PSD_FILES[@]}"
done

echo "✅ Done!"