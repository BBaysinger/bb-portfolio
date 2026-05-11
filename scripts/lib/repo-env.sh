#!/usr/bin/env bash
# shellcheck shell=bash

# Shared helpers for local repo scripts.
# - Loads repo-root .env/.env.local (gitignored) with export semantics.
# - Provides consistent defaults for EC2 host targeting.

bb_load_repo_env() {
  local repo_root="${1:?bb_load_repo_env requires repo_root}"
  local env_file="$repo_root/.env"
  local env_local_file="$repo_root/.env.local"

  if [[ -f "$env_file" ]]; then
    set -a
    # shellcheck disable=SC1090
    source "$env_file"
    set +a
  fi

  # .env.local overrides .env (both are gitignored)
  if [[ -f "$env_local_file" ]]; then
    set -a
    # shellcheck disable=SC1090
    source "$env_local_file"
    set +a
  fi
}

bb_ec2_host() {
  echo "${EC2_HOST:-${EC2_INSTANCE_IP:-${EC2_IP:-}}}"
}

bb_ec2_host_err() {
  echo "EC2_HOST not set. Set EC2_HOST or EC2_INSTANCE_IP in repo-root .env/.env.local" >&2
}

bb_require_ec2_host() {
  local host
  host="$(bb_ec2_host)"
  if [[ -z "$host" ]]; then
    bb_ec2_host_err
    return 1
  fi
  echo "$host"
}

bb_ec2_host_or_die() {
  local host
  host="$(bb_require_ec2_host)" || exit 1
  echo "$host"
}

bb_ec2_ssh_user() {
  echo "${EC2_SSH_USER:-ec2-user}"
}

bb_ec2_ssh_target() {
  local host
  host="$(bb_ec2_host)"
  [[ -n "$host" ]] || return 1
  echo "$(bb_ec2_ssh_user)@$host"
}

bb_ec2_ssh_target_or_die() {
  local target
  target="$(bb_ec2_ssh_target)" || {
    bb_ec2_host_err
    exit 1
  }
  echo "$target"
}

bb_ssh_opts_string() {
  local raw_opts="${SSH_OPTS:-}"

  if [[ -z "$raw_opts" ]]; then
    raw_opts="-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o BatchMode=yes -o ConnectTimeout=20 -o ConnectionAttempts=3 -o ServerAliveInterval=10 -o ServerAliveCountMax=3 -o PreferredAuthentications=publickey -o PubkeyAuthentication=yes -o TCPKeepAlive=yes -o Compression=yes -o LogLevel=ERROR"
  fi

  echo "$raw_opts"
}

bb_retry() {
  local attempts="${1:?attempt count required}"
  local delay_seconds="${2:?delay required}"
  local description="${3:-command}"
  shift 3

  local attempt=1
  local exit_code
  while true; do
    if "$@"; then
      return 0
    else
      exit_code=$?
    fi

    if ((attempt >= attempts)); then
      echo "${description} failed after ${attempt} attempt(s)." >&2
      return "$exit_code"
    fi

    echo "${description} failed (attempt ${attempt}/${attempts}); retrying in ${delay_seconds}s..." >&2
    sleep "$delay_seconds"
    attempt=$((attempt + 1))
  done
}

bb_resolve_ssl_domain() {
  local explicit_domain="${SSL_DOMAIN:-}"
  if [[ -n "$explicit_domain" ]]; then
    echo "${explicit_domain#www.}"
    return 0
  fi

  node - <<'NODE'
const normalizeHostname = (value) => {
  const trimmed = String(value || '').trim()
  if (!trimmed) return ''

  const canonicalize = (hostname) => hostname.replace(/^www\./i, '').replace(/^dev\./i, '')

  try {
    return canonicalize(new URL(trimmed).hostname)
  } catch {
    return canonicalize(trimmed.replace(/^https?:\/\//i, '').replace(/\/.*$/, ''))
  }
}

const collectCandidates = (...values) =>
  values
    .flatMap((value) => String(value || '').split(','))
    .map((value) => normalizeHostname(value))
    .filter(Boolean)

const candidates = collectCandidates(
  process.env.PUBLIC_SERVER_URL,
  process.env.PAYLOAD_PUBLIC_SERVER_URL,
  process.env.FRONTEND_URL,
)

const preferred = candidates[0] || ''
process.stdout.write(preferred)
NODE
}

bb_is_apex_ssl_domain() {
  local domain="${1:-}"
  domain="${domain#www.}"
  [[ -n "$domain" && ! "$domain" =~ ^dev\. ]]
}
