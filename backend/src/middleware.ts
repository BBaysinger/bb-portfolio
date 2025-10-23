import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  // Handle CORS for API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const response = NextResponse.next()

    // Get the frontend URL(s) from environment variables based on ENV_PROFILE
    const envProfile = process.env.ENV_PROFILE || 'local'
    const originKey =
      envProfile === 'prod'
        ? 'PROD_FRONTEND_URL'
        : envProfile === 'dev'
          ? 'DEV_FRONTEND_URL'
          : 'LOCAL_FRONTEND_URL'

    const allowed = (process.env[originKey] || 'http://localhost:3000')
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
  matcher: '/api/:path*',
}
