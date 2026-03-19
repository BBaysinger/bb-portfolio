const { spawnSync } = require('node:child_process')
const fs = require('node:fs')

function ensureImportMap() {
  try {
    const bin = require.resolve('payload/dist/bin.js')
    const result = spawnSync(process.execPath, [bin, 'generate:importmap'], {
      stdio: 'inherit',
    })
    if (result.error) {
      console.error('importmap generation error:', result.error)
    }
  } catch (error) {
    console.warn(
      'payload importmap generation skipped:',
      error && error.message ? error.message : error,
    )
  }
}

ensureImportMap()

try {
  const importMapPath = '/app/.payload/import-map.json'
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
