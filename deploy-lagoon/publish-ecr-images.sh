#!/bin/bash
set -euo pipefail

# Wrapper to keep Lagoon tooling aligned with the canonical ECR publisher.
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

exec "$ROOT_DIR/deploy/scripts/publish-ecr-images.sh" "$@"
