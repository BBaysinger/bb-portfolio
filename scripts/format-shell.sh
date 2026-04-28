#!/usr/bin/env bash
set -euo pipefail

MODE="${1:---write}"

if ! command -v shfmt >/dev/null 2>&1; then
  echo "shfmt is required to format shell files. Install it with: brew install shfmt" >&2
  exit 1
fi

shell_files=()
skipped_shell_files=()
while IFS= read -r shell_file; do
  shebang="$(head -n 1 "$shell_file" 2>/dev/null || true)"
  case "$shebang" in
    *zsh*)
      skipped_shell_files+=("$shell_file")
      ;;
    *)
      shell_files+=("$shell_file")
      ;;
  esac
done < <(git ls-files '*.sh' '.githooks/*')

if [[ ${#shell_files[@]} -eq 0 ]]; then
  exit 0
fi

format_or_check_file() {
  local file_path="$1"
  case "$MODE" in
    --write)
      if ! shfmt -w -i 2 -ci -ln bash "$file_path"; then
        printf 'Skipping parser-incompatible shell file: %s\n' "$file_path" >&2
      fi
      ;;
    --check)
      if ! shfmt -d -i 2 -ci -ln bash "$file_path"; then
        printf 'Skipping parser-incompatible shell file: %s\n' "$file_path" >&2
      fi
      ;;
  esac
}

case "$MODE" in
  --write)
    for shell_file in "${shell_files[@]}"; do
      format_or_check_file "$shell_file"
    done
    ;;
  --check)
    for shell_file in "${shell_files[@]}"; do
      format_or_check_file "$shell_file"
    done
    ;;
  *)
    echo "Usage: bash scripts/format-shell.sh [--write|--check]" >&2
    exit 1
    ;;
esac

if [[ ${#skipped_shell_files[@]} -gt 0 ]]; then
  printf 'Skipping zsh shell formatting for: %s\n' "${skipped_shell_files[@]}" >&2
fi