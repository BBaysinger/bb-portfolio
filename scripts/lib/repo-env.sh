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
