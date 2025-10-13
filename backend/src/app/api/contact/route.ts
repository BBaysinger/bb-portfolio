import { NextRequest, NextResponse } from 'next/server'

import { emailService, type ContactFormData } from '@/services/email'

// Rate limiting - simple in-memory store (in production, use Redis or similar)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT_WINDOW = 15 * 60 * 1000 // 15 minutes
const RATE_LIMIT_MAX_REQUESTS = 3 // Max 3 emails per 15 minutes per IP

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const userLimit = rateLimitMap.get(ip)

  if (!userLimit || now > userLimit.resetTime) {
    // Reset or initialize
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW })
    return false
  }

  if (userLimit.count >= RATE_LIMIT_MAX_REQUESTS) {
    return true
  }

  userLimit.count++
  return false
}

function validateContactData(data: unknown): data is ContactFormData {
  return (
    typeof data === 'object' &&
    data !== null &&
    'name' in data &&
    'email' in data &&
    'message' in data &&
    typeof (data as Record<string, unknown>).name === 'string' &&
    typeof (data as Record<string, unknown>).email === 'string' &&
    typeof (data as Record<string, unknown>).message === 'string' &&
    ((data as Record<string, unknown>).name as string).trim().length > 0 &&
    ((data as Record<string, unknown>).email as string).includes('@') &&
    ((data as Record<string, unknown>).message as string).trim().length > 0 &&
    ((data as Record<string, unknown>).name as string).length <= 100 &&
    ((data as Record<string, unknown>).email as string).length <= 254 &&
    ((data as Record<string, unknown>).message as string).length <= 5000
  )
}

function sanitizeInput(str: string): string {
  return str
    .trim()
    .replace(/[\r\n\t]+/g, ' ')
    .substring(0, 5000)
}

export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const forwarded = request.headers.get('x-forwarded-for')
    const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown'

    // Check rate limiting
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait before sending another message.' },
        { status: 429 },
      )
    }

    // Parse request body
    const body = await request.json()

    // Validate required fields
    if (!validateContactData(body)) {
      return NextResponse.json(
        { error: 'Invalid or missing required fields (name, email, message)' },
        { status: 400 },
      )
    }

    // Sanitize inputs
    const contactData: ContactFormData = {
      name: sanitizeInput(body.name),
      email: sanitizeInput(body.email),
      message: sanitizeInput(body.message),
    }

    // Additional email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(contactData.email)) {
      return NextResponse.json({ error: 'Invalid email address format' }, { status: 400 })
    }

    // Send email using AWS SES
    const result = await emailService.sendContactEmail(contactData)

    if (result.success) {
      return NextResponse.json({ message: 'Message sent successfully!' }, { status: 200 })
    } else {
      console.error('Email service error:', result.error)
      return NextResponse.json(
        { error: 'Failed to send message. Please try again later.' },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error('Contact API error:', error)
    return NextResponse.json(
      { error: 'Internal server error. Please try again later.' },
      { status: 500 },
    )
  }
}

// Handle unsupported methods
export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}
