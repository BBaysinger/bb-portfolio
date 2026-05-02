#!/usr/bin/env tsx

import path from 'path'
import { fileURLToPath } from 'url'

import { getPayload, type Payload } from 'payload'

import { loadBackendScriptEnvironment } from './lib/payload-script-env'
import {
  listFilesByExtension,
  readYamlFile,
  resolvePortfolioContentDir,
} from './lib/portfolio-content'
import { requireExplicitProdWriteConfirmation } from './lib/write-guard'

type ProjectDoc = {
  id: string | number
  slug?: string | null
}

type ProjectFindResult = {
  docs: ProjectDoc[]
}

type ProjectUpdater = {
  update: (args: {
    collection: 'projects'
    id: string | number
    data: {
      descParagraphs: { text: string }[]
    }
    overrideAccess: true
  }) => Promise<unknown>
}

type ProjectDescriptionFile = {
  descParagraphs?: unknown
}

type RetryableMongoError = {
  code?: unknown
  errorLabelSet?: unknown
  errorResponse?: {
    errorLabels?: unknown
  }
}

const PROJECT_UPDATE_MAX_RETRIES = 3
const PROJECT_UPDATE_RETRY_BASE_DELAY_MS = 500

const wait = async (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms)
  })

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

const asParagraphStrings = (value: unknown, filePath: string) => {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`Expected descParagraphs to be a non-empty array in ${filePath}`)
  }

  return value.map((item, index) => {
    if (typeof item !== 'string' || item.trim().length === 0) {
      throw new Error(`Expected descParagraphs[${index}] to be a non-empty string in ${filePath}`)
    }

    return item.trim()
  })
}

const isTransientWriteConflictError = (error: unknown) => {
  if (!error || typeof error !== 'object') return false

  const maybeError = error as RetryableMongoError
  if (maybeError.code === 112) return true

  const topLevelLabels = maybeError.errorLabelSet
  if (topLevelLabels instanceof Set && topLevelLabels.has('TransientTransactionError')) {
    return true
  }

  const nestedLabels = maybeError.errorResponse?.errorLabels
  return Array.isArray(nestedLabels) && nestedLabels.includes('TransientTransactionError')
}

const updateProjectDescriptionsWithRetry = async (
  payload: Payload,
  projectId: string | number,
  paragraphs: string[],
) => {
  const projectUpdater = payload as unknown as ProjectUpdater

  let attempt = 0

  while (true) {
    try {
      await projectUpdater.update({
        collection: 'projects',
        id: projectId,
        data: {
          descParagraphs: paragraphs.map((text) => ({ text })),
        },
        overrideAccess: true,
      })
      return
    } catch (error) {
      attempt += 1

      if (!isTransientWriteConflictError(error) || attempt >= PROJECT_UPDATE_MAX_RETRIES) {
        throw error
      }

      console.warn(
        `Transient Mongo write conflict while updating project ${String(projectId)}. Retrying (${attempt}/${PROJECT_UPDATE_MAX_RETRIES - 1}).`,
      )

      await wait(PROJECT_UPDATE_RETRY_BASE_DELAY_MS * 2 ** (attempt - 1))
    }
  }
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const { envProfile } = loadBackendScriptEnvironment(__dirname)

requireExplicitProdWriteConfirmation('project descriptions import', envProfile)

async function main() {
  let payload: Payload | null = null

  try {
    const contentDir = resolvePortfolioContentDir(__dirname)
    const descriptionsDir = path.resolve(contentDir, 'project-descriptions')
    const descriptionFiles = listFilesByExtension(descriptionsDir, '.yaml')

    if (descriptionFiles.length === 0) {
      console.info(`No project description files found in ${descriptionsDir}. Nothing to import.`)
      return
    }

    const { default: config } = await import('@payload-config')
    payload = await getPayload({ config })

    const candidates = descriptionFiles.map((filePath) => {
      const slug = path.basename(filePath, '.yaml').trim()
      const description = readYamlFile<ProjectDescriptionFile>(filePath)
      const paragraphs = asParagraphStrings(description.descParagraphs, filePath)

      return { filePath, paragraphs, slug }
    })

    const candidateBySlug = new Map(candidates.map((candidate) => [candidate.slug, candidate]))

    const projects = [] as ProjectDoc[]
    let page = 1
    let hasNextPage = true

    while (hasNextPage) {
      const result = (await payload.find({
        collection: 'projects',
        depth: 0,
        limit: 100,
        page,
        overrideAccess: true,
        disableErrors: true,
      })) as ProjectFindResult & { hasNextPage?: boolean; nextPage?: number | null }

      projects.push(...result.docs)
      hasNextPage = result.hasNextPage === true
      page = result.nextPage ?? page + 1
    }

    const matches = [] as Array<{
      filePath: string
      paragraphs: string[]
      slug: string
      projectId: string | number
    }>

    for (const project of projects) {
      const slug = project.slug?.trim()
      if (!slug) continue

      const candidate = candidateBySlug.get(slug)
      if (!candidate) {
        throw new Error(
          `Missing project description file for slug '${slug}'. Expected ${path.join(descriptionsDir, `${slug}.yaml`)}`,
        )
      }

      matches.push({
        ...candidate,
        projectId: project.id,
      })
    }

    for (const candidate of candidates) {
      if (matches.some((match) => match.slug === candidate.slug)) continue
      console.warn(
        `Skipping extra project description file with no matching project slug: ${candidate.filePath}`,
      )
    }

    for (const match of matches) {
      await updateProjectDescriptionsWithRetry(payload, match.projectId, match.paragraphs)
    }

    console.info(
      `Imported ${matches.length} project description files from ${descriptionsDir} into Payload project description paragraphs.`,
    )
  } catch (error) {
    console.error('Failed to import project descriptions:', error)
    process.exitCode = 1
  } finally {
    if (payload) {
      await destroyPayloadWithTimeout(payload, 'project descriptions import')
    }
  }
}

void main()
