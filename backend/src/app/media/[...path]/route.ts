import { promises as fs } from 'fs'
import path from 'path'

import { NextRequest } from 'next/server'

const prefixToDir: Record<string, string> = {
  // Hyphenated folder names
  'brand-logos': 'brand-logos',
  'project-screenshots': 'project-screenshots',
  'project-thumbnails': 'project-thumbnails',

  // Collection slugs -> folder names
  brandLogos: 'brand-logos',
  projectScreenshots: 'project-screenshots',
  projectThumbnails: 'project-thumbnails',
}

function getContentType(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'webp':
      return 'image/webp'
    case 'png':
      return 'image/png'
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg'
    case 'svg':
      return 'image/svg+xml'
    default:
      return 'application/octet-stream'
  }
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  try {
    const { path: pathParts } = await ctx.params
    const [prefix, ...rest] = pathParts
    const dir = prefixToDir[prefix]
    if (!dir || rest.length === 0) return new Response('Not found', { status: 404 })
    const relPath = rest.join('/')
    // Serve from backend/media/<dir>
    const root = path.join(process.cwd(), 'media', dir)
    const unsafePath = path.join(root, relPath)
    const filePath = path.normalize(unsafePath)
    if (!filePath.startsWith(root)) {
      console.warn('[media] Path traversal blocked:', unsafePath)
      return new Response('Not found', { status: 404 })
    }
    const data = await fs.readFile(filePath)
    const contentType = getContentType(filePath)
    // Caveat: We intentionally return immutable, long-lived cache headers here to match how
    // S3/CDN should serve media in non-local environments. To avoid staleness when files are
    // overwritten in-place, the frontend must append a versioning query string (e.g. `?v=...`)
    // so the URL changes whenever content does. Ensure your CDN includes query strings in cache keys.
    return new Response(new Uint8Array(data), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (_err) {
    console.error('[media] read error', _err)
    return new Response('Not found', { status: 404 })
  }
}
