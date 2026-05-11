#!/usr/bin/env tsx

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

import { dump as dumpYaml } from 'js-yaml'
import { getPayload, type Payload } from 'payload'

import { loadBackendScriptEnvironment } from './lib/payload-script-env'
import { resolvePortfolioContentDirPath } from './lib/portfolio-content'

type Options = {
  dryRun: boolean
}

type UploadedLogo = {
  filename?: unknown
  alt?: unknown
}

type BulletPoint = {
  text?: unknown
  enabled?: unknown
}

type ExperienceItem = {
  company?: unknown
  location?: unknown
  title?: unknown
  description?: unknown
  technicalScope?: unknown
  date?: unknown
  logo?: unknown
  bulletPoints?: unknown
  slug?: unknown
  section?: unknown
  position?: unknown
}

type PayloadWithCvExperienceConfigGlobal = Payload & {
  findGlobal(args: {
    slug: 'cvExperienceConfig'
    depth?: number
    overrideAccess?: boolean
  }): Promise<{
    experienceSectionHeading?: string | null
    recentIndependentStudySectionHeading?: string | null
  }>
}

type NormalizedBulletPoint = {
  text: string
  enabled: boolean
}

type NormalizedEntry = {
  company: string
  location: string
  title: string
  description: string
  technicalScope: string
  date: string
  logo?: {
    file: string
    alt?: string
  }
  bulletPoints: NormalizedBulletPoint[]
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

loadBackendScriptEnvironment(__dirname)

const parseArgs = (): Options => ({
  dryRun: process.argv.includes('--dry-run'),
})

const asTrimmedString = (value: unknown) => {
  if (typeof value !== 'string') return ''
  return value.trim()
}

const asNonEmptyString = (value: unknown, fieldName: string) => {
  const normalized = asTrimmedString(value)
  if (!normalized) {
    throw new Error(`Expected ${fieldName} to be a non-empty string.`)
  }

  return normalized
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

const toLogo = (value: unknown) => {
  if (!value || typeof value !== 'object') return undefined

  const logo = value as UploadedLogo
  const file = asTrimmedString(logo.filename)
  if (!file) return undefined

  const alt = asTrimmedString(logo.alt)
  return {
    file,
    ...(alt ? { alt } : {}),
  }
}

const toBulletPoints = (value: unknown): NormalizedBulletPoint[] => {
  if (!Array.isArray(value)) return []

  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const bulletPoint = item as BulletPoint
      const text = asTrimmedString(bulletPoint.text)
      if (!text) return null
      return {
        text,
        enabled: bulletPoint.enabled !== false,
      }
    })
    .filter((item): item is NormalizedBulletPoint => Boolean(item))
}

const normalizeEntry = (value: unknown): NormalizedEntry | null => {
  if (!value || typeof value !== 'object') return null

  const item = value as ExperienceItem

  const company = asTrimmedString(item.company)
  const location = asTrimmedString(item.location)
  const title = asTrimmedString(item.title)
  const description = asTrimmedString(item.description)
  const technicalScope = asTrimmedString(item.technicalScope)
  const date = asTrimmedString(item.date)

  if (!company || !location || !title || !description || !technicalScope || !date) {
    return null
  }

  const logo = toLogo(item.logo)

  return {
    company,
    location,
    title,
    description,
    technicalScope,
    date,
    ...(logo ? { logo } : {}),
    bulletPoints: toBulletPoints(item.bulletPoints),
  }
}

const listYamlFiles = (directoryPath: string) => {
  if (!fs.existsSync(directoryPath)) return [] as string[]

  return fs
    .readdirSync(directoryPath, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.yaml'))
    .map((entry) => path.resolve(directoryPath, entry.name))
}

const serializeEntry = (slug: string, entry: NormalizedEntry) => {
  return dumpYaml(
    {
      slug,
      ...(entry.logo ? { logo: entry.logo } : {}),
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
    },
    {
      lineWidth: -1,
      noRefs: true,
      quotingType: '"',
      forceQuotes: false,
    },
  )
}

async function main() {
  let payload: Payload | null = null

  try {
    const options = parseArgs()
    const contentDir = resolvePortfolioContentDirPath(__dirname)
    const cvDir = path.resolve(contentDir, 'cv-experiences')
    const experienceDir = path.resolve(cvDir, 'experience')
    const independentRdDir = path.resolve(cvDir, 'independent-rd')
    const logosDir = path.resolve(contentDir, 'cv-experience-logos')
    const orderPath = path.resolve(cvDir, 'order.yaml')
    const staleFiles = [...listYamlFiles(experienceDir), ...listYamlFiles(independentRdDir)]

    const { default: config } = await import('@payload-config')
    payload = await getPayload({ config })

    const cvExperienceConfig = await (payload as PayloadWithCvExperienceConfigGlobal).findGlobal({
      slug: 'cvExperienceConfig',
      depth: 0,
      overrideAccess: true,
    })

    const itemsResponse = await payload.find({
      collection: 'cvExperienceItems',
      where: {
        active: { equals: true },
      },
      sort: 'position',
      depth: 1,
      limit: 500,
      overrideAccess: true,
      disableErrors: true,
      draft: false,
    })

    const experienceItems = itemsResponse.docs
      .filter((entry) => entry.section === 'experience')
      .map(normalizeEntry)
      .filter((entry): entry is NormalizedEntry => Boolean(entry))

    const independentItems = itemsResponse.docs
      .filter((entry) => entry.section === 'independent-rd')
      .map(normalizeEntry)
      .filter((entry): entry is NormalizedEntry => Boolean(entry))

    const serializedExperience = itemsResponse.docs
      .filter((entry) => entry.section === 'experience')
      .map((entry) => {
        const normalized = normalizeEntry(entry)
        if (!normalized) return null
        const slug = asNonEmptyString(entry.slug, 'cvExperienceItems.slug')
        return { slug, yaml: serializeEntry(slug, normalized) }
      })
      .filter((entry): entry is { slug: string; yaml: string } => Boolean(entry))

    const serializedIndependent = itemsResponse.docs
      .filter((entry) => entry.section === 'independent-rd')
      .map((entry) => {
        const normalized = normalizeEntry(entry)
        if (!normalized) return null
        const slug = asNonEmptyString(entry.slug, 'cvExperienceItems.slug')
        return { slug, yaml: serializeEntry(slug, normalized) }
      })
      .filter((entry): entry is { slug: string; yaml: string } => Boolean(entry))

    const headingsYaml = dumpYaml(
      {
        experienceSectionHeading: asNonEmptyString(
          cvExperienceConfig.experienceSectionHeading,
          'cvExperienceConfig.experienceSectionHeading',
        ),
        recentIndependentStudySectionHeading:
          asNonEmptyString(
            cvExperienceConfig.recentIndependentStudySectionHeading,
            'cvExperienceConfig.recentIndependentStudySectionHeading',
          ),
      },
      {
        lineWidth: -1,
        noRefs: true,
        quotingType: '"',
        forceQuotes: false,
      },
    )

    const serializedOrderYaml = dumpYaml(
      {
        experience: serializedExperience.map((entry) => entry.slug),
        independentRd: serializedIndependent.map((entry) => entry.slug),
      },
      {
        lineWidth: -1,
        noRefs: true,
        quotingType: '"',
        forceQuotes: false,
      },
    )

    console.info(
      `${options.dryRun ? '[DRY RUN] ' : ''}Preparing to export ${experienceItems.length} CV experience entries and ${independentItems.length} independent R&D entries to ${cvDir}.`,
    )

    if (options.dryRun) {
      console.info(`Would prune ${staleFiles.length} existing YAML entry files before export.`)
      console.info(`Would write ${orderPath}`)
      console.info(`Would write ${path.join(cvDir, 'config.yaml')}`)
      for (const entry of serializedExperience) {
        console.info(`Would write ${path.join(experienceDir, `${entry.slug}.yaml`)}`)
      }
      for (const entry of serializedIndependent) {
        console.info(`Would write ${path.join(independentRdDir, `${entry.slug}.yaml`)}`)
      }
      console.info(
        `Logo files are not downloaded by this exporter. Sync them separately with 'npm run media:pull:prod:cv-experience-logos'.`,
      )
      return
    }

    fs.mkdirSync(experienceDir, { recursive: true })
    fs.mkdirSync(independentRdDir, { recursive: true })
    fs.mkdirSync(logosDir, { recursive: true })

    for (const staleFile of staleFiles) {
      fs.unlinkSync(staleFile)
    }

    fs.writeFileSync(path.join(cvDir, 'config.yaml'), headingsYaml, 'utf8')
    fs.writeFileSync(orderPath, serializedOrderYaml, 'utf8')
    for (const entry of serializedExperience) {
      fs.writeFileSync(path.join(experienceDir, `${entry.slug}.yaml`), entry.yaml, 'utf8')
    }
    for (const entry of serializedIndependent) {
      fs.writeFileSync(path.join(independentRdDir, `${entry.slug}.yaml`), entry.yaml, 'utf8')
    }

    console.info(
      `Exported CV experience content into ${cvDir}. Pruned ${staleFiles.length} stale YAML files. Run 'npm run media:pull:prod:cv-experience-logos' if you also need fresh logo files.`,
    )
  } catch (error) {
    console.error('Failed to export cvExperience content:', error)
    process.exitCode = 1
  } finally {
    if (payload) {
      await destroyPayloadWithTimeout(payload, 'cvExperience export')
    }
  }
}

void main()
  .then(() => {
    process.exit(process.exitCode ?? 0)
  })
  .catch((error) => {
    console.error('Failed to export cvExperience content:', error)
    process.exit(1)
  })
