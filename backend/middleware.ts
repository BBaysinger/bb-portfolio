import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Redirect legacy admin path `/admin/panel` to the conventional `/admin`.
// Note: Next.js basePath is `/admin`, so requests will appear as `/admin/...`.
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Normalize trailing slash for matching
  const hasPanel = pathname === '/admin/panel' || pathname === '/admin/panel/'
  if (hasPanel) {
    const url = req.nextUrl.clone()
    url.pathname = '/admin'
    return NextResponse.redirect(url, 308)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
