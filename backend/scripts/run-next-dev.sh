#!/bin/sh

set -eu

port="${PORT:-3001}"

if [ "${NEXT_DISABLE_TURBOPACK:-0}" = "1" ]; then
  exec next dev --webpack -p "$port"
fi

exec next dev -p "$port"