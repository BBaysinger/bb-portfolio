import configPromise from '@payload-config'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

/**
 * Contact Info API - Returns obfuscated contact email
 * Uses environment variables but applies server-side encoding for additional protection
 */
export async function GET() {
  try {
    // Read public contact info exclusively from CMS Global. No env fallbacks.
    const payload = await getPayload({ config: configPromise })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const contact = await (payload as any).findGlobal({
      slug: 'contactInfo',
      depth: 0,
      overrideAccess: true,
    })

    const email: string | undefined = contact?.contactEmail || undefined
    const phoneE164: string | undefined = contact?.phoneE164 || undefined
    const phoneDisplay: string | undefined = contact?.phoneDisplay || undefined

    if (!email) {
      console.error('[contact-info] Missing contactEmail in CMS Global contactInfo')
      return NextResponse.json({ error: 'Contact information not available' }, { status: 500 })
    }

    // Apply server-side obfuscation
    const [localPart, domain] = email.split('@')

    // Encode parts using different methods
    const encodedLocal = Buffer.from(localPart).toString('base64')
    const encodedDomain = Buffer.from(domain).toString('base64')

    // Phone (optional) — read from CMS Global only; no env fallback

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
