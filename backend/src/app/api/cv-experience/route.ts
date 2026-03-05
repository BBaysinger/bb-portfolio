import configPromise from '@payload-config'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

type BrandLogoRef = {
  url?: unknown
  alt?: unknown
  filename?: unknown
}

type BulletPoint = {
  text?: unknown
  enabled?: unknown
}

type ExperienceItem = {
  blockType?: unknown
  company?: unknown
  location?: unknown
  title?: unknown
  description?: unknown
  technicalScope?: unknown
  date?: unknown
  logo?: unknown
  bulletPoints?: unknown
}

const asTrimmedString = (value: unknown): string => {
  if (typeof value !== 'string') return ''
  return value.trim()
}

const toLogo = (value: unknown): { url: string; alt: string } | null => {
  if (!value || typeof value !== 'object') return null

  const logo = value as BrandLogoRef
  const url = asTrimmedString(logo.url)
  if (!url) return null

  const alt = asTrimmedString(logo.alt) || asTrimmedString(logo.filename) || 'Company logo'
  return { url, alt }
}

const toBulletPoints = (value: unknown): string[] => {
  if (!Array.isArray(value)) return []

  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const bullet = item as BulletPoint
      const isEnabled = bullet.enabled !== false
      const text = asTrimmedString(bullet.text)
      if (!isEnabled || !text) return null
      return text
    })
    .filter((item): item is string => Boolean(item))
}

export async function GET() {
  try {
    const payload = await getPayload({ config: configPromise })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cvExperience = await (payload as any).findGlobal({
      slug: 'cvExperience',
      depth: 1,
      overrideAccess: true,
    })

    const items = (Array.isArray(cvExperience?.experienceItems)
      ? cvExperience.experienceItems
      : []
    )
      .map((entry: unknown) => {
        if (!entry || typeof entry !== 'object') return null
        const item = entry as ExperienceItem
        if (item.blockType !== 'experienceItem') return null

        const company = asTrimmedString(item.company)
        const location = asTrimmedString(item.location)
        const title = asTrimmedString(item.title)
        const description = asTrimmedString(item.description)
        const technicalScope = asTrimmedString(item.technicalScope)
        const date = asTrimmedString(item.date)
        const bulletPoints = toBulletPoints(item.bulletPoints)

        if (!company || !location || !title || !description || !technicalScope || !date) {
          return null
        }

        return {
          company,
          location,
          title,
          description,
          technicalScope,
          date,
          logo: toLogo(item.logo),
          bulletPoints,
        }
      })
      .filter(Boolean)

    return NextResponse.json({
      success: true,
      data: {
        experienceItems: items,
      },
    })
  } catch (error) {
    console.error('CV experience API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve CV experience',
      },
      { status: 500 },
    )
  }
}

export async function POST() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}
