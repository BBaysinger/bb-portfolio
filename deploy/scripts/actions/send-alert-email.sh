#!/usr/bin/env bash
set -euo pipefail

SUBJECT="${1:?email subject arg required}"
BODY="${2:?email body arg required}"

: "${AWS_REGION:?AWS_REGION required}"
: "${SES_FROM_EMAIL:?SES_FROM_EMAIL required}"
: "${SES_TO_EMAIL:?SES_TO_EMAIL required}"

aws sesv2 send-email \
  --region "$AWS_REGION" \
  --from-email-address "$SES_FROM_EMAIL" \
  --destination "ToAddresses=${SES_TO_EMAIL}" \
  --content "Simple={Subject={Data=${SUBJECT},Charset=UTF-8},Body={Text={Data=${BODY},Charset=UTF-8}}}"
