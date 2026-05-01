#!/usr/bin/env tsx

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

import { getPayload, type Payload } from 'payload'

import { loadBackendScriptEnvironment } from './lib/payload-script-env'
import { readYamlFile, requireDirectory, resolvePortfolioContentDir } from './lib/portfolio-content'
import { requireExplicitProdWriteConfirmation } from './lib/write-guard'

type SeedGlobalUpdater = {
  updateGlobal: (args: {
    slug: string
    data: {
      experienceItems: unknown[]
      recentIndependentStudy: unknown[]
    }
  }) => Promise<unknown>
}

type CvOrderFile = {
  experience?: unknown
  independentRd?: unknown
}

type CvLogoConfig = {
  file?: unknown
  alt?: unknown
}

type CvBulletPointInput =
  | string
  | {
      text?: unknown
      enabled?: unknown
    }

type CvEntryInput = {
  slug?: unknown
  logo?: CvLogoConfig
  company?: unknown
  location?: unknown
  title?: unknown
  description?: unknown
  technicalScope?: unknown
  date?: unknown
  bulletPoints?: unknown
}

type NormalizedBulletPoint = {
  text: string
  enabled: boolean
}

type NormalizedCvEntry = {
  slug: string
  company: string
  location: string
  title: string
  description: string
  technicalScope: string
  date: string
  logoFile?: string
  logoAlt?: string
  bulletPoints: NormalizedBulletPoint[]
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const { envProfile } = loadBackendScriptEnvironment(__dirname)

requireExplicitProdWriteConfirmation('cvExperience import', envProfile)

const asNonEmptyString = (value: unknown, fieldName: string, filePath: string) => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Expected ${fieldName} to be a non-empty string in ${filePath}`)
  }

  return value.trim()
}

const destroyPayloadWithTimeout = async (payload: Payload, label: string) => {
  const destroy = payload.db?.destroy
  if (typeof destroy !== 'function') return

  await Promise.race([
    destroy.call(payload.db),
    new Promise<void>((resolve) => {
      setTimeout(() => {
        console.warn(`Timed out while closing Payload DB after ${label}; exiting anyway.`)
        resolve()
      }, 2000)
    }),
  ])
}

const asSlugList = (value: unknown, fieldName: string, filePath: string) => {
  if (!Array.isArray(value)) {
    throw new Error(`Expected ${fieldName} to be an array in ${filePath}`)
  }

  const seen = new Set<string>()

  return value.map((entry, index) => {
    const slug = asNonEmptyString(entry, `${fieldName}[${index}]`, filePath)
    if (seen.has(slug)) {
      throw new Error(`Duplicate slug '${slug}' in ${fieldName} of ${filePath}`)
    }
    seen.add(slug)
    return slug
  })
}

const normalizeBulletPoints = (value: unknown, filePath: string): NormalizedBulletPoint[] => {
  if (value === undefined) return []
  if (!Array.isArray(value)) {
    throw new Error(`Expected bulletPoints to be an array in ${filePath}`)
  }

  return value.map((entry, index) => {
    if (typeof entry === 'string') {
      return {
        text: asNonEmptyString(entry, `bulletPoints[${index}]`, filePath),
        enabled: true,
      }
    }

    if (!entry || typeof entry !== 'object') {
      throw new Error(`Invalid bulletPoints[${index}] entry in ${filePath}`)
    }

    const bullet = entry as CvBulletPointInput & Record<string, unknown>
    return {
      text: asNonEmptyString(bullet.text, `bulletPoints[${index}].text`, filePath),
      enabled: typeof bullet.enabled === 'boolean' ? bullet.enabled : true,
    }
  })
}

const loadCvEntry = (sectionDir: string, slug: string) => {
  const filePath = path.resolve(sectionDir, `${slug}.yaml`)
  const entry = readYamlFile<CvEntryInput>(filePath)

  if (entry.slug !== undefined) {
    const declaredSlug = asNonEmptyString(entry.slug, 'slug', filePath)
    if (declaredSlug !== slug) {
      throw new Error(
        `Slug mismatch in ${filePath}: expected '${slug}', received '${declaredSlug}'`,
      )
    }
  }

  const logo =
    entry.logo && typeof entry.logo === 'object' ? (entry.logo as CvLogoConfig) : undefined

  return {
    slug,
    company: asNonEmptyString(entry.company, 'company', filePath),
    location: asNonEmptyString(entry.location, 'location', filePath),
    title: asNonEmptyString(entry.title, 'title', filePath),
    description: asNonEmptyString(entry.description, 'description', filePath),
    technicalScope: asNonEmptyString(entry.technicalScope, 'technicalScope', filePath),
    date: asNonEmptyString(entry.date, 'date', filePath),
    logoFile:
      logo?.file === undefined ? undefined : asNonEmptyString(logo.file, 'logo.file', filePath),
    logoAlt: logo?.alt === undefined ? undefined : asNonEmptyString(logo.alt, 'logo.alt', filePath),
    bulletPoints: normalizeBulletPoints(entry.bulletPoints, filePath),
  } satisfies NormalizedCvEntry
}

const upsertCvLogo = async (
  payload: Payload,
  logosDir: string,
  entry: NormalizedCvEntry,
): Promise<string | undefined> => {
  if (!entry.logoFile) return undefined

  const sourceFilePath = path.resolve(logosDir, entry.logoFile)
  if (!fs.existsSync(sourceFilePath)) {
    throw new Error(`Missing logo file for '${entry.slug}': ${sourceFilePath}`)
  }

  const existing = await payload.find({
    collection: 'cvExperienceLogos',
    where: {
      filename: { equals: entry.logoFile },
    },
    limit: 1,
    depth: 0,
    overrideAccess: true,
    disableErrors: true,
  })

  if (existing.docs.length > 0) {
    const existingDoc = existing.docs[0]
    if (entry.logoAlt) {
      await payload.update({
        collection: 'cvExperienceLogos',
        id: existingDoc.id,
        data: {
          alt: entry.logoAlt,
        },
        overrideAccess: true,
      })
    }
    return String(existingDoc.id)
  }

  const created = await payload.create({
    collection: 'cvExperienceLogos',
    filePath: sourceFilePath,
    data: {
      alt: entry.logoAlt ?? `${entry.company} logo`,
    },
    overrideAccess: true,
  })

  return String(created.id)
}

const mapCvEntryToBlock = async (payload: Payload, logosDir: string, entry: NormalizedCvEntry) => {
  const logoId = await upsertCvLogo(payload, logosDir, entry)

  return {
    blockType: 'experienceItem' as const,
    ...(logoId ? { logo: logoId } : {}),
    company: entry.company,
    location: entry.location,
    title: entry.title,
    description: entry.description,
    technicalScope: entry.technicalScope,
    date: entry.date,
    bulletPoints: entry.bulletPoints.map((bulletPoint) => ({
      text: bulletPoint.text,
      enabled: bulletPoint.enabled,
    })),
  }
}

async function main() {
  let payload: Payload | null = null

  try {
    const contentDir = resolvePortfolioContentDir(__dirname)
    const cvDir = path.resolve(contentDir, 'cv-experiences')
    const experienceDir = path.resolve(cvDir, 'experience')
    const independentRdDir = path.resolve(cvDir, 'independent-rd')
    const logosDir = path.resolve(contentDir, 'cv-experience-logos')
    const orderPath = path.resolve(cvDir, 'order.yaml')

    requireDirectory(cvDir, 'cv-experiences directory')
    requireDirectory(experienceDir, 'cv-experiences/experience directory')
    requireDirectory(independentRdDir, 'cv-experiences/independent-rd directory')
    requireDirectory(logosDir, 'cv-experience-logos directory')

    const orderFile = readYamlFile<CvOrderFile>(orderPath)
    const experienceOrder = asSlugList(orderFile.experience, 'experience', orderPath)
    const independentRdOrder = asSlugList(orderFile.independentRd ?? [], 'independentRd', orderPath)

    const experienceEntries = experienceOrder.map((slug) => loadCvEntry(experienceDir, slug))
    const independentEntries = independentRdOrder.map((slug) => loadCvEntry(independentRdDir, slug))

    const { default: config } = await import('@payload-config')
    payload = await getPayload({ config })

    const experienceItems = []
    for (const entry of experienceEntries) {
      experienceItems.push(await mapCvEntryToBlock(payload, logosDir, entry))
    }

    const recentIndependentStudy = []
    for (const entry of independentEntries) {
      recentIndependentStudy.push(await mapCvEntryToBlock(payload, logosDir, entry))
    }

    const globalUpdater = payload as unknown as SeedGlobalUpdater
    await globalUpdater.updateGlobal({
      slug: 'cvExperience',
      data: {
        experienceItems,
        recentIndependentStudy,
      },
    })

    console.info(
      `Imported cvExperience content from ${contentDir} with ${experienceItems.length} experience items and ${recentIndependentStudy.length} independent R&D items.`,
    )
  } catch (error) {
    console.error('Failed to import cvExperience content:', error)
    process.exitCode = 1
  } finally {
    if (payload) {
      await destroyPayloadWithTimeout(payload, 'cvExperience import')
    }
  }
}

void main()
