#!/usr/bin/env bash
set -euo pipefail

SNAPSHOT_PATH="${1:-/tmp/static_content_snapshot}"

if [ ! -s "$SNAPSHOT_PATH" ]; then
  exit 0
fi

node -e 'const fs=require("node:fs");const path=process.argv[1];const raw=fs.readFileSync(path,"utf8");let parsed;try{parsed=JSON.parse(raw);}catch{console.error("Invalid STATIC_CONTENT_SNAPSHOT_JSON: not valid JSON");process.exit(1);}if(!parsed||typeof parsed!=="object"||Array.isArray(parsed)){console.error("Invalid STATIC_CONTENT_SNAPSHOT_JSON: expected object envelope");process.exit(1);}for(const key of ["brandingLockup","greeting","cvExperience"]){if(!(key in parsed)||!parsed[key]||typeof parsed[key]!=="object"||Array.isArray(parsed[key])){console.error(`Invalid STATIC_CONTENT_SNAPSHOT_JSON: missing ${key}`);process.exit(1);}}' "$SNAPSHOT_PATH"
