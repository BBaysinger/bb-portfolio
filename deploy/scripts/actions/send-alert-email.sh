#!/usr/bin/env bash
set -euo pipefail

SUBJECT="${1:?email subject arg required}"
BODY="${2:?email body arg required}"

: "${AWS_REGION:?AWS_REGION required}"
: "${SES_FROM_EMAIL:?SES_FROM_EMAIL required}"
: "${SES_TO_EMAIL:?SES_TO_EMAIL required}"

EMAIL_JSON_FILE="$(mktemp)"
trap 'rm -f "$EMAIL_JSON_FILE"' EXIT

python3 - <<'PY' >"$EMAIL_JSON_FILE"
import json
import os

payload = {
    "Simple": {
        "Subject": {"Data": os.environ["SUBJECT"], "Charset": "UTF-8"},
        "Body": {"Text": {"Data": os.environ["BODY"], "Charset": "UTF-8"}},
    }
}

print(json.dumps(payload))
PY

aws sesv2 send-email \
  --region "$AWS_REGION" \
  --from-email-address "$SES_FROM_EMAIL" \
  --destination "ToAddresses=${SES_TO_EMAIL}" \
  --content "file://$EMAIL_JSON_FILE"
