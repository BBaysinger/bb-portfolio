import { NextResponse } from 'next/server'

/**
 * Contact Info API - Returns obfuscated contact email
 * Uses environment variables but applies server-side encoding for additional protection
 */
export async function GET() {
  try {
    // Get email from environment variables using the same pattern as email service
    // Normalize profile (prod/dev/local) for consistent key lookup, but also keep raw fallback
    const rawProfile = process.env.ENV_PROFILE || process.env.NODE_ENV || 'local'
    const lower = rawProfile.toLowerCase()
    const normalized = lower.startsWith('prod')
      ? 'prod'
      : lower.startsWith('dev')
        ? 'dev'
        : lower.startsWith('local')
          ? 'local'
          : lower
    const upper = normalized.toUpperCase()
    const rawUpper = (process.env.ENV_PROFILE || '').toUpperCase()
    // Preferred order:
    // 1) <PROFILE>_CONTACT_EMAIL (explicit override if provided)
    // 2) OBFUSCATED_CONTACT_EMAIL (site-wide security.txt/contact address)
    // 3) SECURITY_CONTACT_EMAIL (legacy name; fallback for compatibility)
    // 4) <PROFILE>_SES_TO_EMAIL (default: same destination as contact form)
    const preferredKeys = [
      `${upper}_CONTACT_EMAIL`,
      'OBFUSCATED_CONTACT_EMAIL',
      'SECURITY_CONTACT_EMAIL',
      `${upper}_SES_TO_EMAIL`,
      // raw ENV_PROFILE fallbacks (e.g., PRODUCTION_CONTACT_EMAIL)
      ...(rawUpper ? [`${rawUpper}_CONTACT_EMAIL`, `${rawUpper}_SES_TO_EMAIL`] : []),
    ] as const
    let email: string | undefined
    for (const key of preferredKeys) {
      if (process.env[key]) {
        email = process.env[key]
        break
      }
    }

    if (!email) {
      console.error(
        `Missing environment variable for contact email. Tried: ${preferredKeys.join(', ')}`,
      )
      return NextResponse.json({ error: 'Contact information not available' }, { status: 500 })
    }

    // Apply server-side obfuscation
    const [localPart, domain] = email.split('@')

    // Encode parts using different methods
    const encodedLocal = Buffer.from(localPart).toString('base64')
    const encodedDomain = Buffer.from(domain).toString('base64')

    // Phone (optional) — use ENV_PROFILE-based keys if available
    const phoneE164Key = `${upper}_CONTACT_PHONE_E164`
    const phoneDispKey = `${upper}_CONTACT_PHONE_DISPLAY`
    const phoneE164RawKey = rawUpper ? `${rawUpper}_CONTACT_PHONE_E164` : ''
    const phoneDispRawKey = rawUpper ? `${rawUpper}_CONTACT_PHONE_DISPLAY` : ''
    const phoneE164 =
      process.env[phoneE164Key] || (phoneE164RawKey ? process.env[phoneE164RawKey] : undefined)
    const phoneDisplay =
      process.env[phoneDispKey] ||
      (phoneDispRawKey ? process.env[phoneDispRawKey] : undefined) ||
      process.env[phoneE164Key] ||
      (phoneE164RawKey ? process.env[phoneE164RawKey] : undefined)

    let phonePayload: { e: string; d: string; checksum: string } | undefined
    if (phoneE164) {
      const encE164 = Buffer.from(phoneE164).toString('base64')
      const encDisplay = Buffer.from(phoneDisplay || '').toString('base64')
      phonePayload = {
        e: encE164,
        d: encDisplay,
        checksum: (encE164.length + encDisplay.length).toString(16),
      }
    }

    // Return obfuscated data with metadata for client-side reconstruction
    return NextResponse.json({
      success: true,
      data: {
        l: encodedLocal,
        d: encodedDomain,
        // Add some noise/decoy data
        timestamp: Date.now(),
        checksum: (encodedLocal.length + encodedDomain.length).toString(16),
        // New structured payload for additional fields (e.g., phone)
        phone: phonePayload,
      },
    })
  } catch (error) {
    console.error('Contact info API error:', error)
    return NextResponse.json({ error: 'Failed to retrieve contact information' }, { status: 500 })
  }
}

// Handle unsupported methods
export async function POST() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}
