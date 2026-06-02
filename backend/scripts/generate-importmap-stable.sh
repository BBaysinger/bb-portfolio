#!/bin/sh
set -eu

# Keep the committed Payload import map stable across local/dev/prod runs.
# Local ENV_PROFILE disables the S3 plugin, which drops admin import-map entries
# and causes noisy version-control churn. Generate against the canonical
# non-local profile unless a caller explicitly overrides it.
: "${PAYLOAD_IMPORTMAP_CANONICAL_PROFILE:=dev}"
export ENV_PROFILE="$PAYLOAD_IMPORTMAP_CANONICAL_PROFILE"

exec payload generate:importmap