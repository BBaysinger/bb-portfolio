import { randomBytes } from 'node:crypto'

const BASE62_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'

/**
 * Generates a URL-safe Base62 short code.
 *
 * Uses rejection sampling to avoid modulo bias.
 */
export function generateShortCode(length = 10): string {
  if (!Number.isFinite(length) || length <= 0) {
    throw new Error(`Invalid short code length: ${length}`)
  }

  const out: string[] = []
  // 62 * 4 = 248 is the largest multiple of 62 < 256
  const max = 248

  while (out.length < length) {
    // Pull more bytes than needed to reduce loop iterations.
    const buf = randomBytes(Math.max(16, length))
    for (let i = 0; i < buf.length && out.length < length; i++) {
      const v = buf[i]
      if (v >= max) continue
      out.push(BASE62_ALPHABET[v % 62]!)
    }
  }

  return out.join('')
}
