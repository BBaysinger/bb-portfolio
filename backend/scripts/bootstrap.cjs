const fs = require('node:fs')

try {
  const importMapPath = '/app/src/app/(payload)/importMap.js'
  if (fs.existsSync(importMapPath)) {
    console.info('[bootstrap] import-map present:', importMapPath)
  } else {
    console.warn('[bootstrap] import-map missing at', importMapPath)
  }
} catch {}

try {
  require('/app/app/server.js')
} catch (error) {
  console.error(
    'Failed to start Next.js from /app/app/server.js:',
    error && error.message ? error.message : error,
  )
  process.exit(1)
}
