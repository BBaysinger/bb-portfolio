#!/usr/bin/env bash
set -euo pipefail

SNAPSHOT_PATH="${1:-/tmp/project_data_snapshot}"

if [ ! -s "$SNAPSHOT_PATH" ]; then
  exit 0
fi

node -e 'const fs=require("node:fs");const path=process.argv[1];const raw=fs.readFileSync(path,"utf8");let parsed;try{parsed=JSON.parse(raw);}catch{console.error("Invalid PROJECT_DATA_SNAPSHOT_JSON: not valid JSON");process.exit(1);}const data=parsed&&typeof parsed==="object"&&"data" in parsed?parsed.data:parsed;const isPayloadRest=(v)=>!!v&&typeof v==="object"&&Array.isArray(v.docs);if(!data||typeof data!=="object"||Array.isArray(data)){console.error("Invalid PROJECT_DATA_SNAPSHOT_JSON: expected object record or envelope { data, metadata }");process.exit(1);}if(isPayloadRest(data)){console.error("Invalid PROJECT_DATA_SNAPSHOT_JSON: raw Payload REST { docs: [...] } is not supported; provide normalized project record");process.exit(1);}' "$SNAPSHOT_PATH"
