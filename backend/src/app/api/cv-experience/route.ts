import configPromise from '@payload-config'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

const CV_EXPERIENCE_LOGO_COLLECTION = 'cvExperienceLogos'
const CV_EXPERIENCE_LOGO_PREFIX = 'cv-experience-logos'

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

const normalizeEnvProfile = (value: string) => {
  const normalized = value.toLowerCase().trim()
  if (normalized.startsWith('local')) return 'local'
  if (normalized === 'development' || normalized.startsWith('dev')) return 'dev'
  if (normalized.startsWith('prod')) return 'prod'
  return normalized
}

const trimTrailingSlashes = (value: string) => value.replace(/\/+$/, '')

const encodePathSegments = (value: string) =>
  value
    .split('/')
    .filter((segment) => segment.length > 0)
    .map((segment) => encodeURIComponent(segment))
    .join('/')

const getPublicMediaBaseUrl = () => {
  const envProfile = normalizeEnvProfile(
    asTrimmedString(process.env.ENV_PROFILE || process.env.NODE_ENV || ''),
  )
  if (envProfile === 'local') return ''

  const explicitBaseUrl = asTrimmedString(process.env.S3_BASE_URL)
  if (explicitBaseUrl) return trimTrailingSlashes(explicitBaseUrl)

  const bucket = asTrimmedString(process.env.S3_BUCKET)
  const region = asTrimmedString(process.env.AWS_REGION) || asTrimmedString(process.env.S3_REGION)
  if (bucket && region) {
    return `https://${bucket}.s3.${region}.amazonaws.com`
  }

  return ''
}

const getPublicCvExperienceLogoUrl = (filename: string) => {
  const encodedFilename = encodePathSegments(filename)
  const publicMediaBaseUrl = getPublicMediaBaseUrl()

  if (publicMediaBaseUrl) {
    return `${publicMediaBaseUrl}/${CV_EXPERIENCE_LOGO_PREFIX}/${encodedFilename}`
  }

  return `/api/media/${CV_EXPERIENCE_LOGO_PREFIX}/${encodedFilename}`
}

const extractPayloadUploadFilename = (url: string) => {
  const payloadUploadPrefix = `/api/${CV_EXPERIENCE_LOGO_COLLECTION}/file/`

  try {
    const parsedUrl = new URL(url, 'https://example.invalid')
    if (!parsedUrl.pathname.startsWith(payloadUploadPrefix)) return ''
    return decodeURIComponent(parsedUrl.pathname.slice(payloadUploadPrefix.length))
  } catch {
    return ''
  }
}

const shouldReplaceCvExperienceLogoUrl = (url: string) => {
  const payloadUploadPrefix = `/api/${CV_EXPERIENCE_LOGO_COLLECTION}/file/`

  try {
    const parsedUrl = new URL(url, 'https://example.invalid')
    return (
      parsedUrl.pathname.startsWith(payloadUploadPrefix) ||
      parsedUrl.pathname.startsWith(`/media/${CV_EXPERIENCE_LOGO_PREFIX}/`) ||
      parsedUrl.pathname.startsWith(`/api/media/${CV_EXPERIENCE_LOGO_PREFIX}/`)
    )
  } catch {
    return false
  }
}

const toLogo = (value: unknown): { url: string; alt: string } | null => {
  if (!value || typeof value !== 'object') return null

  const logo = value as BrandLogoRef
  const rawUrl = asTrimmedString(logo.url)
  const filename =
    asTrimmedString(logo.filename) || (rawUrl ? extractPayloadUploadFilename(rawUrl) : '')
  const url =
    filename && (!rawUrl || shouldReplaceCvExperienceLogoUrl(rawUrl))
      ? getPublicCvExperienceLogoUrl(filename)
      : rawUrl
  if (!url) return null

  const alt = asTrimmedString(logo.alt) || filename || 'Company logo'
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

    const mapItem = (entry: unknown) => {
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

      if (!company || !title || !date) {
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
    }

    const items = (Array.isArray(cvExperience?.experienceItems) ? cvExperience.experienceItems : [])
      .map((entry: unknown) => {
        return mapItem(entry)
      })
      .filter(Boolean)

    const recentIndependentStudyEntries = Array.isArray(cvExperience?.recentIndependentStudy)
      ? cvExperience.recentIndependentStudy
      : []
    const recentIndependentStudyItems = recentIndependentStudyEntries
      .map((entry: unknown) => mapItem(entry))
      .filter(Boolean)

    return NextResponse.json({
      success: true,
      data: {
        experienceItems: items,
        recentIndependentStudyItems,
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
