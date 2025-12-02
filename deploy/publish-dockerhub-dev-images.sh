#!/bin/bash
set -euo pipefail

# Wrapper script retained for compatibility. Core logic lives in deploy/scripts/publish-dockerhub-dev-images.sh.
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
exec "$SCRIPT_DIR/scripts/publish-dockerhub-dev-images.sh" "$@"

echo "✅ Published to Docker Hub (dev):"
echo "  - $FRONTEND_IMAGE"
echo "  - $BACKEND_IMAGE"
