import fs from 'node:fs'

import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const paths = [
      '/app/.payload/import-map.json',
      '/app/src/app/(payload)/admin/importMap.js',
    ]
    const results = paths.map((p) => {
      const exists = fs.existsSync(p)
      const size = exists ? fs.statSync(p).size : 0
      return { exists, path: p, size }
    })
    const anyExists = results.some((r) => r.exists && r.size > 0)
    return NextResponse.json({ anyExists, results })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
