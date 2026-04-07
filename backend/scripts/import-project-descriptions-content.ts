#!/usr/bin/env tsx

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

import { getPayload, type Payload } from 'payload'

import { loadBackendScriptEnvironment } from './lib/payload-script-env'
import { listFilesByExtension, resolvePortfolioContentDir } from './lib/portfolio-content'

type ProjectDoc = {
  id: string | number
  slug?: string | null
}

type ProjectFindResult = {
  docs: ProjectDoc[]
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

loadBackendScriptEnvironment(__dirname)

async function main() {
  let payload: Payload | null = null

  try {
    const contentDir = resolvePortfolioContentDir(__dirname)
    const descriptionsDir = path.resolve(contentDir, 'project-descriptions')
    const descriptionFiles = listFilesByExtension(descriptionsDir, '.html')

    if (descriptionFiles.length === 0) {
      console.info(`No project description files found in ${descriptionsDir}. Nothing to import.`)
      return
    }

    const { default: config } = await import('../src/payload.config')
    payload = await getPayload({ config })

    const candidates = descriptionFiles.map((filePath) => {
      const slug = path.basename(filePath, '.html')
      const html = fs.readFileSync(filePath, 'utf8').trim()

      if (!html) {
        throw new Error(`Project description file is empty: ${filePath}`)
      }

      return { filePath, html, slug }
    })

    const matches = [] as Array<{
      filePath: string
      html: string
      slug: string
      projectId: string | number
    }>

    for (const candidate of candidates) {
      const found = (await payload.find({
        collection: 'projects',
        where: { slug: { equals: candidate.slug } },
        depth: 0,
        limit: 1,
        overrideAccess: true,
        disableErrors: true,
      })) as ProjectFindResult

      if (found.docs.length === 0) {
        throw new Error(
          `No project found for slug '${candidate.slug}'. Add the project first or rename ${candidate.filePath}.`,
        )
      }

      matches.push({
        ...candidate,
        projectId: found.docs[0].id,
      })
    }

    for (const match of matches) {
      await payload.update({
        collection: 'projects',
        id: match.projectId,
        data: {
          desc: [{ block: match.html }],
        },
        overrideAccess: true,
      })
    }

    console.info(
      `Imported ${matches.length} project description files from ${descriptionsDir} into Payload project desc blocks.`,
    )
  } catch (error) {
    console.error('Failed to import project descriptions:', error)
    process.exitCode = 1
  } finally {
    if (payload) {
      await payload.db?.destroy?.()
    }
  }
}

void main()
