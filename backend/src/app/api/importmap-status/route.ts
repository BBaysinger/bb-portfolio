import { NextResponse } from 'next/server'
import fs from 'node:fs'
import path from 'node:path'

export async function GET() {
  try {
    const p = '/app/.payload/import-map.json'
    const exists = fs.existsSync(p)
    const size = exists ? fs.statSync(p).size : 0
    return NextResponse.json({ exists, path: p, size })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 500 })
  }
}
