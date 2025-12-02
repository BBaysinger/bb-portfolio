#!/bin/bash
set -euo pipefail

# Wrapper to keep the Lagoon tooling in sync with the canonical dev image publisher.
# Delegates to deploy/scripts/publish-dockerhub-dev-images.sh (neutral env flow) and
# preserves the previous safety step that ensured Docker Hub repositories stay public.

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ENSURE_PUBLIC_SCRIPT="$ROOT_DIR/scripts/dockerhub-ensure-public.sh"
REPOS="bhbaysinger/bb-portfolio-backend,bhbaysinger/bb-portfolio-frontend"

if [[ -x "$ENSURE_PUBLIC_SCRIPT" ]]; then
  echo "Ensuring Docker Hub repositories are public before publishing dev images..."
  bash "$ENSURE_PUBLIC_SCRIPT" --repositories "$REPOS" || true
fi

exec "$ROOT_DIR/deploy/scripts/publish-dockerhub-dev-images.sh" "$@"
