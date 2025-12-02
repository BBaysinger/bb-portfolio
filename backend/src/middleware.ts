import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Normalize any accidental double admin segments (/admin/admin/...) that legacy cached assets
  // might emit. Short-circuit before hitting Payload so we avoid 404s or redirect loops entirely.
  if (pathname.startsWith('/admin/admin')) {
    const url = request.nextUrl.clone()
    url.pathname = pathname.replace(/^\/admin\/admin/, '/admin')
    return NextResponse.redirect(url)
  }

  // Guard: sanitize admin login redirect to avoid recursive self-redirects
  // If /admin/login?redirect=... points back to login or has duplicated /admin/admin segments,
  // coerce it to a safe default (/admin). Perform at most one redirect by only changing when needed.
  if (pathname.startsWith('/admin/login')) {
    const url = request.nextUrl.clone()
    // One-time guard to avoid repeated rewrites from RSC subrequests
    const alreadySanitized = request.cookies.get('x-admin-login-sanitized')?.value === '1'
    const current = url.searchParams.get('redirect') || ''

    // Heuristics that indicate a bad/looping redirect value
    const pointsToLogin = /^\/admin\/login(\/?|\?|$)/.test(current)
    const hasDupAdmin = /\/admin\/admin(\/|$)/.test(current)
    const isFlipFlopAdmin = current === '/admin' || current === '/admin/'

    if (
      (url.searchParams.has('redirect') && (pointsToLogin || hasDupAdmin || isFlipFlopAdmin)) ||
      (!current && url.searchParams.has('redirect'))
    ) {
      // Drop the redirect param completely and serve the login page in place
      url.searchParams.delete('redirect')
      // Normalize path: ensure /admin/login/ (trailing slash) to match backend config
      if (url.pathname === '/admin/login') url.pathname = '/admin/login/'
      if (!alreadySanitized) {
        const res = NextResponse.rewrite(url)
        res.cookies.set('x-admin-login-sanitized', '1', {
          path: '/admin',
          httpOnly: false,
          maxAge: 5,
        })
        return res
      }
    }
  }

  // Handle CORS for API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const response = NextResponse.next()

    const allowed = (process.env.FRONTEND_URL || 'http://localhost:3000')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    const origin = request.headers.get('origin')

    // Allow requests from configured frontend URLs
    if (origin && allowed.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin)
    }

    response.headers.set('Access-Control-Allow-Credentials', 'true')
    response.headers.set('Access-Control-Allow-Methods', 'GET,DELETE,PATCH,POST,PUT,OPTIONS')
    response.headers.set(
      'Access-Control-Allow-Headers',
      'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version',
    )

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 200, headers: response.headers })
    }

    return response
  }

  return NextResponse.next()
}

export const config = {
  // Run for API and Admin routes
  matcher: ['/api/:path*', '/admin/:path*'],
}
