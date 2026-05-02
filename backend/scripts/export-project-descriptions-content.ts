#!/usr/bin/env tsx

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

import { getPayload, type Payload } from 'payload'

import { serializeParagraphArrayYaml } from './lib/paragraph-yaml'
import { loadBackendScriptEnvironment } from './lib/payload-script-env'
import { resolvePortfolioContentDirPath } from './lib/portfolio-content'

type Options = {
  dryRun: boolean
}

type ProjectDescriptionBlock = {
  text?: unknown
}

type ProjectDoc = {
  slug?: unknown
  descParagraphs?: unknown
}

type ProjectFindResult = {
  docs: ProjectDoc[]
  hasNextPage?: boolean
  nextPage?: number | null
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

const toDescriptionParagraphs = (value: unknown) => {
  if (!Array.isArray(value)) return [] as string[]

  return value
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return ''
      const block = entry as ProjectDescriptionBlock
      return asTrimmedString(block.text)
    })
    .filter(Boolean)
}

const serializeProjectDescription = (descParagraphs: string[]) =>
  serializeParagraphArrayYaml('descParagraphs', descParagraphs)

const listYamlFiles = (directoryPath: string) => {
  if (!fs.existsSync(directoryPath)) return [] as string[]

  return fs
    .readdirSync(directoryPath, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.yaml'))
    .map((entry) => path.resolve(directoryPath, entry.name))
}

async function main() {
  let payload: Payload | null = null

  try {
    const options = parseArgs()
    const contentDir = resolvePortfolioContentDirPath(__dirname)
    const descriptionsDir = path.resolve(contentDir, 'project-descriptions')

    const { default: config } = await import('@payload-config')
    payload = await getPayload({ config })

    const matchedProjects = [] as Array<{ slug: string; yaml: string }>
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
      })) as ProjectFindResult

      for (const doc of result.docs) {
        const slug = asTrimmedString(doc.slug)
        const descParagraphs = toDescriptionParagraphs(doc.descParagraphs)
        if (!slug || descParagraphs.length === 0) continue
        matchedProjects.push({ slug, yaml: serializeProjectDescription(descParagraphs) })
      }

      hasNextPage = result.hasNextPage === true
      page = result.nextPage ?? page + 1
    }

    if (matchedProjects.length === 0) {
      console.info('No project descriptions found in Payload. Nothing to export.')
      return
    }

    const staleFiles = listYamlFiles(descriptionsDir)

    console.info(
      `${options.dryRun ? '[DRY RUN] ' : ''}Preparing to export ${matchedProjects.length} project descriptions to ${descriptionsDir}.`,
    )

    if (options.dryRun) {
      console.info(`Would prune ${staleFiles.length} existing YAML files before export.`)
      for (const project of matchedProjects) {
        console.info(`Would write ${path.join(descriptionsDir, `${project.slug}.yaml`)}`)
      }
      return
    }

    fs.mkdirSync(descriptionsDir, { recursive: true })
    for (const staleFile of staleFiles) {
      fs.unlinkSync(staleFile)
    }

    for (const project of matchedProjects) {
      const destinationPath = path.join(descriptionsDir, `${project.slug}.yaml`)
      fs.writeFileSync(destinationPath, project.yaml, 'utf8')
    }

    console.info(
      `Exported ${matchedProjects.length} project descriptions into ${descriptionsDir}. Pruned ${staleFiles.length} stale YAML files.`,
    )
  } catch (error) {
    console.error('Failed to export project descriptions:', error)
    process.exitCode = 1
  } finally {
    if (payload) {
      await destroyPayloadWithTimeout(payload, 'project descriptions export')
    }
  }
}

void main()
