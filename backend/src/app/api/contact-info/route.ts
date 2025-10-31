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

    // Return obfuscated data with metadata for client-side reconstruction
    return NextResponse.json({
      success: true,
      data: {
        l: encodedLocal,
        d: encodedDomain,
        // Add some noise/decoy data
        timestamp: Date.now(),
        checksum: (encodedLocal.length + encodedDomain.length).toString(16),
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
