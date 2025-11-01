import { NextResponse } from 'next/server'

/**
 * Contact Info API - Returns obfuscated contact email
 * Uses environment variables but applies server-side encoding for additional protection
 */
export async function GET() {
  try {
    // Get email from environment variables using the same pattern as email service
    const envProfile = process.env.ENV_PROFILE || 'local'
    const prefixedKey = `${envProfile.toUpperCase()}_SES_TO_EMAIL`
    const email = process.env[prefixedKey]

    if (!email) {
      console.error(`Missing environment variable: ${prefixedKey}`)
      return NextResponse.json({ error: 'Contact information not available' }, { status: 500 })
    }

    // Apply server-side obfuscation
    const [localPart, domain] = email.split('@')

    // Encode parts using different methods
    const encodedLocal = Buffer.from(localPart).toString('base64')
    const encodedDomain = Buffer.from(domain).toString('base64')

    // Phone (optional) — use ENV_PROFILE-based keys if available
    const phoneE164Key = `${envProfile.toUpperCase()}_CONTACT_PHONE_E164`
    const phoneDispKey = `${envProfile.toUpperCase()}_CONTACT_PHONE_DISPLAY`
    const phoneE164 = process.env[phoneE164Key]
    const phoneDisplay = process.env[phoneDispKey] || process.env[phoneE164Key]

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
