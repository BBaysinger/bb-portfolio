import configPromise from '@payload-config'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import {
  DEFAULT_CV_CORE_STRENGTHS_HTML,
  DEFAULT_CV_SUMMARY_HTML,
} from '@/globals/cvExperienceConfigDefaults'

const CV_EXPERIENCE_LOGO_COLLECTION = 'cvExperienceLogos'
const CV_EXPERIENCE_LOGO_PREFIX = 'cv-experience-logos'
const CV_EXPERIENCE_ITEM_COLLECTION = 'cvExperienceItems'

type BrandLogoRef = {
  url?: unknown
  alt?: unknown
  filename?: unknown
}

type BulletPoint = {
  text?: unknown
  enabled?: unknown
}

type CvExperienceConfigGlobal = {
  summaryHtml?: unknown
  coreStrengthsHtml?: unknown
  experienceSectionHeading?: unknown
  recentIndependentStudySectionHeading?: unknown
}

type CollectionExperienceItem = {
  company?: unknown
  location?: unknown
  title?: unknown
  description?: unknown
  technicalScope?: unknown
  date?: unknown
  logo?: unknown
  bulletPoints?: unknown
  active?: unknown
  section?: unknown
  position?: unknown
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

const mapCollectionItem = (entry: unknown) => {
  if (!entry || typeof entry !== 'object') return null
  const item = entry as CollectionExperienceItem
  if (item.active === false) return null

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

export async function GET() {
  try {
    const payload = await getPayload({ config: configPromise })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const collectionConfig = (await (payload as any)
      .findGlobal({
        slug: 'cvExperienceConfig',
        depth: 0,
        overrideAccess: true,
      })
      .catch(() => null)) as CvExperienceConfigGlobal | null

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const collectionItemsResponse = await (payload as any)
      .find({
        collection: CV_EXPERIENCE_ITEM_COLLECTION,
        where: {
          active: { equals: true },
        },
        sort: 'position',
        depth: 1,
        limit: 200,
        overrideAccess: true,
        disableErrors: true,
        draft: false,
      })
      .catch(() => null)

    const collectionDocs = Array.isArray(collectionItemsResponse?.docs)
      ? collectionItemsResponse.docs
      : []

    if (!collectionConfig) {
      throw new Error('Missing cvExperienceConfig global.')
    }

    if (collectionDocs.length === 0) {
      throw new Error('No cvExperienceItems documents found.')
    }

    const experienceItems = collectionDocs
      .filter((entry: CollectionExperienceItem) => entry?.section === 'experience')
      .map((entry: unknown) => mapCollectionItem(entry))
      .filter(Boolean)

    const recentIndependentStudyItems = collectionDocs
      .filter((entry: CollectionExperienceItem) => entry?.section === 'independent-rd')
      .map((entry: unknown) => mapCollectionItem(entry))
      .filter(Boolean)

    return NextResponse.json({
      success: true,
      data: {
        summaryHtml:
          asTrimmedString(collectionConfig?.summaryHtml) || DEFAULT_CV_SUMMARY_HTML,
        coreStrengthsHtml:
          asTrimmedString(collectionConfig?.coreStrengthsHtml) ||
          DEFAULT_CV_CORE_STRENGTHS_HTML,
        experienceSectionHeading:
          asTrimmedString(collectionConfig?.experienceSectionHeading) || 'Experience',
        experienceItems,
        recentIndependentStudySectionHeading:
          asTrimmedString(collectionConfig?.recentIndependentStudySectionHeading) ||
          'Independent R&D',
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
