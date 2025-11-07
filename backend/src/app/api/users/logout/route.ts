/**
 * Custom logout route wrapper
 *
 * Why: Ensure aggressive, multi-variant cookie invalidation (host + apex) to prevent
 * lingering auth across sibling domains (e.g., bbaysinger.com vs bbinteractive.io).
 * This supplements Payload's built-in /api/users/logout endpoint which may only
 * clear one cookie scope.
 */
export const runtime = 'nodejs'

// Force dynamic; never cache logout responses
export const dynamic = 'force-dynamic'
export const revalidate = 0

function deriveApex(host: string): string {
  const base = host.replace(/:\d+$/, '')
  const parts = base.split('.')
  if (parts.length < 2) return ''
  // Handle common multi-part TLDs (io, com, net) simplistically: last two labels
  return parts.slice(-2).join('.')
}

function buildExpireSetCookie(name: string, opts: { domain?: string; secure?: boolean }) {
  const pieces = [
    `${name}=`, // blank value
    'Path=/',
    'Expires=Thu, 01 Jan 1970 00:00:00 GMT',
    'Max-Age=0',
    'HttpOnly',
    'SameSite=Lax',
  ]
  if (opts.domain) pieces.unshift(`Domain=.${opts.domain}`) // put domain first for readability
  if (opts.secure) pieces.push('Secure')
  return pieces.join('; ')
}

export async function POST(request: Request) {
  const host = request.headers.get('host') || ''
  const proto = request.headers.get('x-forwarded-proto') || (host.includes(':443') ? 'https' : '')
  const secure = proto === 'https'
  const apex = deriveApex(host)

  const headers = new Headers()
  // Always clear host-scoped cookies
  for (const name of ['payload-token', 'authToken']) {
    headers.append('Set-Cookie', buildExpireSetCookie(name, { secure }))
    if (apex) headers.append('Set-Cookie', buildExpireSetCookie(name, { domain: apex, secure }))
  }

  // Explicit no-store caching directives
  headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private')
  headers.set('Pragma', 'no-cache')
  headers.set('Expires', '0')

  return new Response(
    JSON.stringify({ message: 'Logged out', cleared: { host, apex, cookieNames: ['payload-token', 'authToken'] } }),
    { status: 200, headers },
  )
}
