#!/usr/bin/env bash
set -euo pipefail

# Export PSDs found under ../cms-seedings/{project-screenshots,project-thumbnails}
# into WebP files written back into those same folders.
# This script is location-independent and resolves paths relative to itself.

# Resolve directories
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Seed base is the sibling folder to the repo: ../cms-seedings
SEED_BASE="${REPO_DIR}/../cms-seedings"
if [[ ! -d "$SEED_BASE" ]]; then
  echo "Error: Seed folder not found at: $SEED_BASE" >&2
  echo "Create it next to the repo and place your PSDs inside project-screenshots/ and project-thumbnails/." >&2
  exit 2
fi

# Input directories under the seed folder
INPUT_DIRS=(
  "$SEED_BASE/project-screenshots"
  "$SEED_BASE/project-thumbnails"
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

# Process each input directory
for INPUT_DIR in "${INPUT_DIRS[@]}"; do
  # Skip missing input directories gracefully
  if [[ ! -d "$INPUT_DIR" ]]; then
    echo "Skipping missing directory: $INPUT_DIR"
    continue
  fi

  echo "Converting $INPUT_DIR -> (same folder)"

  # Convert PSD (case-insensitive) to WebP into the same folder.
  # Use bracket expansion to support .psd and .PSD without enabling nocaseglob globally.
  shopt -s nullglob
  PSD_FILES=("$INPUT_DIR"/*.[Pp][Ss][Dd])
  if (( ${#PSD_FILES[@]} == 0 )); then
    echo "No PSD files found in $INPUT_DIR; nothing to convert."
    continue
  fi

  "${MOGRIFY_CMD[@]}" \
    -path "$INPUT_DIR" \
    -format webp \
    -quality "$QUALITY" \
    "${PSD_FILES[@]}"
done

echo "✅ Done!"