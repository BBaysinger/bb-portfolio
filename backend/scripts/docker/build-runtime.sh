#!/bin/sh
set -eu

PROFILE="$(printf '%s' "${ENV_PROFILE:-prod}" | tr '[:upper:]' '[:lower:]')"

to_secret_key() {
    printf '%s' "$1" | tr '[:upper:]' '[:lower:]'
}

read_profile_secret() {
    profile="$1"
    var="$2"
    key="$(to_secret_key "$var")"
    canonical_path="/run/secrets/${key}"
    secret_path="/run/secrets/${profile}_${key}"

    if [ -f "$canonical_path" ]; then
        cat "$canonical_path"
        return
    fi

    if [ -f "$secret_path" ]; then
        cat "$secret_path"
    fi
}

read_shared_secret() {
    name="$1"
    secret_path="/run/secrets/$name"
    if [ -f "$secret_path" ]; then
        cat "$secret_path"
    fi
}

assign_if_present() {
    var="$1"
    value="$2"
    if [ -n "$value" ]; then
        export "$var=$value"
    fi
}

COMMON_VARS="
MONGODB_URI
PAYLOAD_SECRET
FRONTEND_URL
S3_BUCKET
PUBLIC_PROJECTS_BUCKET
NDA_PROJECTS_BUCKET
AWS_REGION
SECURITY_TXT_EXPIRES
SES_FROM_EMAIL
SES_TO_EMAIL
SMTP_FROM_EMAIL
BACKEND_INTERNAL_URL
PUBLIC_SERVER_URL
"

for var in $COMMON_VARS; do
    assign_if_present "$var" "$(read_profile_secret "$PROFILE" "$var")"
done

assign_if_present AWS_ACCESS_KEY_ID "$(read_shared_secret aws_access_key_id)"
assign_if_present AWS_SECRET_ACCESS_KEY "$(read_shared_secret aws_secret_access_key)"

if [ "$PROFILE" != "prod" ]; then
    : "${MONGODB_URI:=mongodb://localhost/${PROFILE}-dummy}"
    : "${PAYLOAD_SECRET:=dev-dummy-secret}"
    : "${FRONTEND_URL:=http://localhost:3000}"
    : "${S3_BUCKET:=dummy-bucket}"
    : "${AWS_REGION:=us-east-1}"
    : "${SES_FROM_EMAIL:=dummy@example.com}"
    : "${SES_TO_EMAIL:=dummy@example.com}"
    : "${SMTP_FROM_EMAIL:=$SES_FROM_EMAIL}"
    : "${BACKEND_INTERNAL_URL:=http://localhost:3000}"
    : "${PUBLIC_SERVER_URL:=${FRONTEND_URL}}"
    : "${PUBLIC_PROJECTS_BUCKET:=dummy-public-projects-bucket}"
    : "${NDA_PROJECTS_BUCKET:=dummy-nda-projects-bucket}"
    : "${SECURITY_TXT_EXPIRES:=2099-01-01T00:00:00.000Z}"
    : "${NEXT_SERVER_ACTIONS_ENCRYPTION_KEY:=dev-server-actions-encryption-key}"
fi

export \
    MONGODB_URI \
    PAYLOAD_SECRET \
    FRONTEND_URL \
    S3_BUCKET \
    PUBLIC_PROJECTS_BUCKET \
    NDA_PROJECTS_BUCKET \
    AWS_REGION \
    SECURITY_TXT_EXPIRES \
    SES_FROM_EMAIL \
    SES_TO_EMAIL \
    SMTP_FROM_EMAIL \
    BACKEND_INTERNAL_URL \
    PUBLIC_SERVER_URL \
    NEXT_SERVER_ACTIONS_ENCRYPTION_KEY

require_var() {
    var="$1"
    eval "value=\${$var-}"
    if [ -z "$value" ]; then
        echo "Missing required $var for profile $PROFILE" >&2
        exit 1
    fi
}

if [ "$PROFILE" = "prod" ]; then
    for var in $COMMON_VARS; do
        if [ "$var" = "SES_FROM_EMAIL" ]; then
            if [ -z "${SES_FROM_EMAIL:-}" ] && [ -z "${SMTP_FROM_EMAIL:-}" ]; then
                echo "Missing required SES_FROM_EMAIL or SMTP_FROM_EMAIL for profile $PROFILE" >&2
                exit 1
            fi
            continue
        fi

        if [ "$var" = "SMTP_FROM_EMAIL" ]; then
            continue
        fi

        require_var "$var"
    done
fi

npm run build