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
# Keep ICC profile in the output (prevents washed-out colors when the source uses AdobeRGB/P3)
# Set KEEP_ICC=0 to strip ICC after converting to sRGB
KEEP_ICC="${KEEP_ICC:-1}"
# Optional: explicitly set a SOURCE_PROFILE ICC to convert from (e.g., Display P3 or AdobeRGB1998)
# If not set, you can enable AUTO_ASSUME_P3=1 on macOS to prefer Display P3 when input is untagged.
SOURCE_PROFILE="${SOURCE_PROFILE:-}"
AUTO_ASSUME_P3="${AUTO_ASSUME_P3:-1}"
# Rendering intent for profile conversions: relative|perceptual|saturation|absolute
RENDERING_INTENT="${RENDERING_INTENT:-relative}"
# Layer compositing options
# BACKGROUND can be a hex like "#ffffff" or "none" to preserve alpha (default)
BACKGROUND="${BACKGROUND:-none}"
# If NO_FLATTEN=1, use -layers merge with background instead of -flatten (helps when PSD uses complex blending)
NO_FLATTEN="${NO_FLATTEN:-0}"
# If FORCE_ASSIGN_SRGB=1, do not transform colors; only tag as sRGB when no ICC is present (useful if images are already sRGB but untagged)
FORCE_ASSIGN_SRGB="${FORCE_ASSIGN_SRGB:-0}"
# Optional perceptual gamma tweak, e.g., 0.95 (values <1 darken slightly, >1 brighten). Leave empty to skip.
GAMMA_TWEAK="${GAMMA_TWEAK:-}"

# macOS-specific: Prefer ColorSync via `sips` + `cwebp` for most faithful color if available
USE_SIPS="${USE_SIPS:-}"
if [[ -z "$USE_SIPS" ]]; then
  if [[ "$(uname -s)" == "Darwin" ]] && command -v sips >/dev/null 2>&1 && command -v cwebp >/dev/null 2>&1; then
    USE_SIPS=1
  else
    USE_SIPS=0
  fi
fi

# Exact mode: do NOT convert colors; preserve embedded ICC and encode as-is
EXACT_MODE="${EXACT_MODE:-0}"
# Lossless WebP encoding option for pixel-exact colors (bigger files)
LOSSLESS="${LOSSLESS:-0}"

# Verify ImageMagick is available (prefer v7 'magick', fallback to v6 'convert')
CONVERT_CMD=()
IDENTIFY_CMD=()
if command -v magick >/dev/null 2>&1; then
  CONVERT_CMD=(magick)
  IDENTIFY_CMD=(magick identify)
elif command -v convert >/dev/null 2>&1; then
  CONVERT_CMD=(convert)
  if command -v identify >/dev/null 2>&1; then
    IDENTIFY_CMD=(identify)
  else
    echo "Error: ImageMagick 'identify' command not found." >&2
    exit 1
  fi
else
  echo "Error: ImageMagick is not installed or not in PATH." >&2
  echo "Install via Homebrew: brew install imagemagick" >&2
  exit 1
fi

# Locate an sRGB ICC profile for color-managed conversion
# macOS common locations first, then typical Linux paths
SRGB_CANDIDATES=(
  "/System/Library/ColorSync/Profiles/sRGB Profile.icc"
  "/Library/ColorSync/Profiles/sRGB Profile.icc"
  "/System/Library/ColorSync/Profiles/Generic RGB Profile.icc"
  "/usr/share/color/icc/colord/sRGB.icc"
  "/usr/share/color/icc/sRGB.icc"
)
SRGB_PROFILE=""
for p in "${SRGB_CANDIDATES[@]}"; do
  if [[ -f "$p" ]]; then
    SRGB_PROFILE="$p"
    break
  fi
done
if [[ -z "$SRGB_PROFILE" ]]; then
  echo "Warning: No sRGB ICC profile found. Will attempt a colorspace tag only (less accurate)." >&2
fi

# Try to resolve a default Display P3 profile on macOS if SOURCE_PROFILE is not explicitly provided
if [[ -z "$SOURCE_PROFILE" && "$AUTO_ASSUME_P3" == "1" ]]; then
  P3_CANDIDATES=(
    "/System/Library/ColorSync/Profiles/Display P3.icc"
    "/Library/ColorSync/Profiles/Display P3.icc"
  )
  for p in "${P3_CANDIDATES[@]}"; do
    if [[ -f "$p" ]]; then
      SOURCE_PROFILE="$p"
      break
    fi
  done
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

  # Convert PSD (case-insensitive) to WebP into the OUTPUT_DIR.
  # We process files one-by-one and flatten layers to avoid animated WebP.
  shopt -s nullglob
  PSD_FILES=("$INPUT_DIR"/*.[Pp][Ss][Dd])
  if (( ${#PSD_FILES[@]} == 0 )); then
    echo "No PSD files found in $INPUT_DIR; nothing to convert."
    continue
  fi

  for PSD in "${PSD_FILES[@]}"; do
  base="$(basename "${PSD%.*}")"
    out="$OUTPUT_DIR/${base}.webp"
    # macOS ColorSync pipeline (sips -> png -> cwebp):
    if [[ "$USE_SIPS" == "1" ]]; then
      tmp_png="$(mktemp -t "${base}.XXXX").png"
      # Choose a profile for sips
      SIPS_PROFILE="$SRGB_PROFILE"
      if [[ -z "$SIPS_PROFILE" ]]; then
        # Fallback generic
        SIPS_PROFILE="/System/Library/ColorSync/Profiles/sRGB Profile.icc"
      fi
      echo "[sips] Converting with ColorSync -> PNG then WebP: $PSD"
      # If EXACT_MODE, do not color-convert, just transcode to PNG preserving embedded ICC
      if [[ "$EXACT_MODE" == "1" ]]; then
        if ! sips -s format png "$PSD" --out "$tmp_png" >/dev/null; then
          echo "[sips] Failed to process $PSD, falling back to ImageMagick"
          rm -f "$tmp_png"
        else
          # Optional gamma tweak is intentionally ignored in EXACT_MODE
          # Encode to WebP
          if [[ "$KEEP_ICC" == "1" ]]; then
            if [[ "$LOSSLESS" == "1" ]]; then
              cwebp -lossless -z 6 -metadata icc "$tmp_png" -o "$out" >/dev/null
            else
              cwebp -q "$QUALITY" -sharp_yuv -alpha_q 100 -metadata icc "$tmp_png" -o "$out" >/dev/null
            fi
          else
            if [[ "$LOSSLESS" == "1" ]]; then
              cwebp -lossless -z 6 "$tmp_png" -o "$out" >/dev/null
            else
              cwebp -q "$QUALITY" -sharp_yuv -alpha_q 100 "$tmp_png" -o "$out" >/devnull
            fi
          fi
          rm -f "$tmp_png"
          continue
        fi
      fi
      # Convert to sRGB and PNG using ColorSync (non-exact mode)
      if ! sips -s format png --matchTo "$SIPS_PROFILE" "$PSD" --out "$tmp_png" >/dev/null; then
        echo "[sips] Failed to process $PSD, falling back to ImageMagick"
        rm -f "$tmp_png"
      else
        # Optional gamma tweak prior to encoding
        if [[ -n "$GAMMA_TWEAK" ]]; then
          if [[ ${#CONVERT_CMD[@]} -gt 0 ]]; then
            tmp_png2="$(mktemp -t "${base}.XXXX").png"
            "${CONVERT_CMD[@]}" "$tmp_png" -gamma "$GAMMA_TWEAK" "$tmp_png2"
            rm -f "$tmp_png"
            tmp_png="$tmp_png2"
          fi
        fi
        # Encode to WebP with sharp YUV and quality. Preserve ICC when requested.
        if [[ "$KEEP_ICC" == "1" ]]; then
          if [[ "$LOSSLESS" == "1" ]]; then
            cwebp -lossless -z 6 -metadata icc "$tmp_png" -o "$out" >/dev/null
          else
            cwebp -q "$QUALITY" -sharp_yuv -alpha_q 100 -metadata icc "$tmp_png" -o "$out" >/dev/null
          fi
        else
          if [[ "$LOSSLESS" == "1" ]]; then
            cwebp -lossless -z 6 "$tmp_png" -o "$out" >/dev/null
          else
            cwebp -q "$QUALITY" -sharp_yuv -alpha_q 100 "$tmp_png" -o "$out" >/dev/null
          fi
        fi
        rm -f "$tmp_png"
        continue
      fi
    fi

    # Color-managed conversion via ImageMagick:
    # 1) Read and flatten PSD layers.
    # 2) Convert embedded profile -> sRGB (or tag sRGB if no profile found), to avoid "washed out" colors
    #    in browsers that assume sRGB.
    # 3) Optionally keep ICC profile to be explicit; browsers understand ICC in WebP.
    # 4) Encode with sharp YUV to reduce chroma bleed.
    if [[ -n "$SRGB_PROFILE" ]]; then
      # If a SOURCE_PROFILE is configured, first convert from that profile, then to sRGB.
      # This avoids the typical brightness/desaturation shift from wide-gamut -> sRGB.
      # Compose layers first
      if [[ "$NO_FLATTEN" == "1" ]]; then
        COMPOSE_OPTS=( -background "$BACKGROUND" -alpha on -layers merge )
      else
        COMPOSE_OPTS=( -background "$BACKGROUND" -alpha on -flatten )
      fi
  CONVERT_CHAIN=( "${COMPOSE_OPTS[@]}" -intent "$RENDERING_INTENT" -black-point-compensation true )
      # Detect whether the input already carries an embedded ICC profile. If yes, skip assigning
      # SOURCE_PROFILE and let the embedded profile drive the conversion to sRGB. If not, assign
      # SOURCE_PROFILE first (when provided) so the transform to sRGB is correct.
      HAS_ICC="0"
      if "${IDENTIFY_CMD[@]}" -quiet -format '%[profiles]' "$PSD" 2>/dev/null | grep -qi 'icc'; then
        HAS_ICC="1"
      fi
      if [[ "$HAS_ICC" == "1" ]]; then
        echo "Embedded ICC detected -> converting to sRGB for $PSD"
      else
        if [[ -n "$SOURCE_PROFILE" ]]; then
          echo "No ICC detected -> assigning SOURCE_PROFILE then converting to sRGB for $PSD"
          CONVERT_CHAIN+=( -profile "$SOURCE_PROFILE" )
        else
          echo "No ICC detected and no SOURCE_PROFILE set"
          if [[ "$FORCE_ASSIGN_SRGB" == "1" ]]; then
            echo "FORCE_ASSIGN_SRGB=1 -> tagging as sRGB without transform"
            CONVERT_CHAIN+=( -set colorspace sRGB )
          fi
        fi
      fi
      if [[ "$EXACT_MODE" == "1" ]]; then
        # In exact mode, do not transform colors — just keep the embedded profile (if any)
        echo "EXACT_MODE=1 -> preserving embedded ICC without transform for $PSD"
      else
        CONVERT_CHAIN+=( -profile "$SRGB_PROFILE" )
      fi
      # Optional subtle gamma tweak
      if [[ -n "$GAMMA_TWEAK" && "$EXACT_MODE" != "1" ]]; then
        CONVERT_CHAIN+=( -gamma "$GAMMA_TWEAK" )
      fi
      if [[ "$KEEP_ICC" == "1" ]]; then
        if [[ "$LOSSLESS" == "1" ]]; then
          "${CONVERT_CMD[@]}" "$PSD" \
            "${CONVERT_CHAIN[@]}" \
            -define webp:lossless=true -define webp:method=6 \
            "$out"
        else
          "${CONVERT_CMD[@]}" "$PSD" \
            "${CONVERT_CHAIN[@]}" \
            -define webp:use-sharp-yuv=true \
            -quality "$QUALITY" \
            "$out"
        fi
      else
        if [[ "$LOSSLESS" == "1" ]]; then
          "${CONVERT_CMD[@]}" "$PSD" \
            "${CONVERT_CHAIN[@]}" \
            -strip \
            -define webp:lossless=true -define webp:method=6 \
            "$out"
        else
          "${CONVERT_CMD[@]}" "$PSD" \
            "${CONVERT_CHAIN[@]}" \
            -strip \
            -define webp:use-sharp-yuv=true \
            -quality "$QUALITY" \
            "$out"
        fi
      fi
    else
      # Fallback when no ICC profile is available on the system: tag sRGB colorspace
      # (less accurate than ICC conversion, but better than leaving pixels untagged).
      if [[ "$KEEP_ICC" == "1" ]]; then
        "${CONVERT_CMD[@]}" "$PSD" \
          -flatten \
          -colorspace sRGB \
          -define webp:use-sharp-yuv=true \
          -quality "$QUALITY" \
          "$out"
      else
        "${CONVERT_CMD[@]}" "$PSD" \
          -flatten \
          -colorspace sRGB \
          -strip \
          -define webp:use-sharp-yuv=true \
          -quality "$QUALITY" \
          "$out"
      fi
    fi
  done
done

echo "✅ Done!"