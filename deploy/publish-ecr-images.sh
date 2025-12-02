#!/bin/bash
set -euo pipefail

# Wrapper script retained for compatibility. Core logic lives in deploy/scripts/publish-ecr-images.sh.
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
exec "$SCRIPT_DIR/scripts/publish-ecr-images.sh" "$@"
