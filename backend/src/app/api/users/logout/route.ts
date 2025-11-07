/**
 * Custom logout route wrapper
 *
 * Why: Ensure reliable cookie invalidation for the single canonical host per environment.
 * This supplements Payload's built-in /api/users/logout endpoint with explicit
 * Set-Cookie headers (Path=/, HttpOnly, SameSite=Lax, Secure in prod, Expires + Max-Age=0).
 */
export const runtime = 'nodejs'

// Force dynamic; never cache logout responses
export const dynamic = 'force-dynamic'
export const revalidate = 0

function buildExpireSetCookie(name: string, opts: { secure?: boolean }) {
  const pieces = [
    `${name}=`, // blank value
    'Path=/',
    'Expires=Thu, 01 Jan 1970 00:00:00 GMT',
    'Max-Age=0',
    'HttpOnly',
    'SameSite=Lax',
  ]
  if (opts.secure) pieces.push('Secure')
  return pieces.join('; ')
}

export async function POST(request: Request) {
  const host = request.headers.get('host') || ''
  const proto = request.headers.get('x-forwarded-proto') || (host.includes(':443') ? 'https' : '')
  const secure = proto === 'https'

  const headers = new Headers()
  // Always clear host-scoped cookies
  for (const name of ['payload-token', 'authToken']) {
    headers.append('Set-Cookie', buildExpireSetCookie(name, { secure }))
  }

  // Explicit no-store caching directives
  headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private')
  headers.set('Pragma', 'no-cache')
  headers.set('Expires', '0')

  return new Response(
    JSON.stringify({
      message: 'Logged out',
      cleared: { host, cookieNames: ['payload-token', 'authToken'] },
    }),
    { status: 200, headers },
  )
}
