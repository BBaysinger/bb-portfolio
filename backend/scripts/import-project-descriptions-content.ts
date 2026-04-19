#!/usr/bin/env tsx

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

import { getPayload, type Payload } from 'payload'

import { loadBackendScriptEnvironment } from './lib/payload-script-env'
import { listFilesByExtension, resolvePortfolioContentDir } from './lib/portfolio-content'
import { requireExplicitProdWriteConfirmation } from './lib/write-guard'

type ProjectDoc = {
  id: string | number
  slug?: string | null
}

type ProjectFindResult = {
  docs: ProjectDoc[]
}

const VOID_TAGS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
])

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const { envProfile } = loadBackendScriptEnvironment(__dirname)

requireExplicitProdWriteConfirmation('project descriptions import', envProfile)

const findTagEnd = (source: string, startIndex: number) => {
  let quote: '"' | "'" | null = null

  for (let index = startIndex + 1; index < source.length; index += 1) {
    const char = source[index]
    const prevChar = source[index - 1]

    if (quote) {
      if (char === quote && prevChar !== '\\') {
        quote = null
      }
      continue
    }

    if (char === '"' || char === "'") {
      quote = char
      continue
    }

    if (char === '>') {
      return index
    }
  }

  return -1
}

const getTagName = (tagBody: string) => {
  const match = /^\/?\s*([A-Za-z][A-Za-z0-9:-]*)/.exec(tagBody)
  return match?.[1]?.toLowerCase() ?? null
}

const isSelfClosingTag = (tagBody: string, tagName: string | null) => {
  if (!tagName) return /\/\s*$/.test(tagBody)
  return /\/\s*$/.test(tagBody) || VOID_TAGS.has(tagName)
}

const toRootHtmlBlocks = (html: string, filePath: string) => {
  const source = html.trim()
  const blocks: string[] = []
  let cursor = 0

  while (cursor < source.length) {
    while (cursor < source.length && /\s/.test(source[cursor])) {
      cursor += 1
    }

    if (cursor >= source.length) break

    if (!source.startsWith('<', cursor)) {
      let textEnd = source.indexOf('<', cursor)
      if (textEnd < 0) textEnd = source.length

      const text = source.slice(cursor, textEnd).trim()
      if (text) blocks.push(text)
      cursor = textEnd
      continue
    }

    if (source.startsWith('<!--', cursor)) {
      const commentEnd = source.indexOf('-->', cursor + 4)
      if (commentEnd < 0) {
        throw new Error(`Unclosed HTML comment in ${filePath}`)
      }
      cursor = commentEnd + 3
      continue
    }

    const blockStart = cursor
    const openingTagEnd = findTagEnd(source, cursor)
    if (openingTagEnd < 0) {
      throw new Error(`Malformed HTML tag in ${filePath}`)
    }

    const openingTagBody = source.slice(cursor + 1, openingTagEnd).trim()
    if (openingTagBody.startsWith('/')) {
      throw new Error(`Unexpected closing tag at root level in ${filePath}`)
    }

    const rootTagName = getTagName(openingTagBody)

    cursor = openingTagEnd + 1

    if (openingTagBody.startsWith('!') || openingTagBody.startsWith('?')) {
      const block = source.slice(blockStart, cursor).trim()
      if (block) blocks.push(block)
      continue
    }

    if (isSelfClosingTag(openingTagBody, rootTagName)) {
      const block = source.slice(blockStart, cursor).trim()
      if (block) blocks.push(block)
      continue
    }

    let depth = 1
    while (cursor < source.length && depth > 0) {
      if (source.startsWith('<!--', cursor)) {
        const commentEnd = source.indexOf('-->', cursor + 4)
        if (commentEnd < 0) {
          throw new Error(`Unclosed HTML comment in ${filePath}`)
        }
        cursor = commentEnd + 3
        continue
      }

      if (!source.startsWith('<', cursor)) {
        cursor += 1
        continue
      }

      const innerTagEnd = findTagEnd(source, cursor)
      if (innerTagEnd < 0) {
        throw new Error(`Malformed nested HTML tag in ${filePath}`)
      }

      const innerTagBody = source.slice(cursor + 1, innerTagEnd).trim()
      const innerTagName = getTagName(innerTagBody)
      const isClosingTag = innerTagBody.startsWith('/')

      if (innerTagName && innerTagName === rootTagName) {
        if (isClosingTag) {
          depth -= 1
        } else if (!isSelfClosingTag(innerTagBody, innerTagName)) {
          depth += 1
        }
      }

      cursor = innerTagEnd + 1
    }

    if (depth !== 0) {
      throw new Error(`Unbalanced HTML root element in ${filePath}`)
    }

    const block = source.slice(blockStart, cursor).trim()
    if (block) blocks.push(block)
  }

  if (blocks.length === 0) {
    throw new Error(`Project description file has no root content blocks: ${filePath}`)
  }

  return blocks
}

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

    const { default: config } = await import('@payload-config')
    payload = await getPayload({ config })

    const candidates = descriptionFiles.map((filePath) => {
      const slug = path.basename(filePath, '.html')
      const html = fs.readFileSync(filePath, 'utf8').trim()

      if (!html) {
        throw new Error(`Project description file is empty: ${filePath}`)
      }

      const blocks = toRootHtmlBlocks(html, filePath)

      return { filePath, blocks, slug }
    })

    const matches = [] as Array<{
      filePath: string
      blocks: string[]
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
          desc: match.blocks.map((block) => ({ block })),
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
