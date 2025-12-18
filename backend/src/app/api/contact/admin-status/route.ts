import { NextRequest, NextResponse } from 'next/server'

import { getContactEmailDiagnostics } from '@/services/email'

function getAdminToken(): string | null {
  return process.env.CONTACT_DIAGNOSTICS_TOKEN || null
}

export async function GET(request: NextRequest) {
  try {
    const auth = request.headers.get('authorization') || ''
    const token = (auth.startsWith('Bearer ') ? auth.slice(7) : '').trim()
    const expected = getAdminToken()
    if (!expected || !token || token !== expected) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const diagnostics = getContactEmailDiagnostics()
    return NextResponse.json(diagnostics, { status: 200 })
  } catch (error) {
    console.error('Admin contact status error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}
