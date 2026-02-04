/**
 * Contact email status API route.
 *
 * Returns non-sensitive configuration status (no secret values).
 */
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const profileRaw = (process.env.ENV_PROFILE || process.env.NODE_ENV || '').toLowerCase()
    const profile = profileRaw.startsWith('prod')
      ? 'prod'
      : profileRaw.startsWith('dev') || profileRaw === 'development'
        ? 'dev'
        : profileRaw.startsWith('local')
          ? 'local'
          : profileRaw || 'unknown'

    const pick = (keys: string[]) => {
      for (const k of keys) if (process.env[k]) return k
      return ''
    }

    const regionKey = pick(['AWS_REGION'])
    const fromKey = pick(['SES_FROM_EMAIL'])
    const toKey = pick(['SES_TO_EMAIL'])

    const configured = Boolean(regionKey && fromKey && toKey)

    return NextResponse.json(
      {
        profile,
        configured,
        keys: {
          region: regionKey || null,
          from: fromKey || null,
          to: toKey || null,
        },
      },
      { status: 200 },
    )
  } catch (error) {
    console.error('Contact status endpoint error:', error)
    return NextResponse.json({ error: 'Failed to retrieve status' }, { status: 500 })
  }
}

export async function POST() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}
