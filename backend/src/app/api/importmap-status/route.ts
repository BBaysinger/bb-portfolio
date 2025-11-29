import fs from 'node:fs'

import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const p = '/app/.payload/import-map.json'
    const exists = fs.existsSync(p)
    const size = exists ? fs.statSync(p).size : 0
    return NextResponse.json({ exists, path: p, size })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
