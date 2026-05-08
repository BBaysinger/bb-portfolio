import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

import { getPayload, type Payload } from 'payload'

import { serializeParagraphArrayYaml } from './paragraph-yaml'
import { loadBackendScriptEnvironment } from './payload-script-env'
import {
  readYamlFile,
  resolvePortfolioContentDir,
  resolvePortfolioContentDirPath,
} from './portfolio-content'
import { requireExplicitProdWriteConfirmation } from './write-guard'

type GreetingFile = {
  introParagraphs?: unknown
  bodyParagraphs?: unknown
}

type GreetingGlobalUpdater = {
  updateGlobal: (args: {
    slug: string
    data: {
      introParagraphs: { text: string }[]
      bodyParagraphs: { text: string }[]
    }
  }) => Promise<unknown>
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const scriptsDir = path.resolve(__dirname, '..')

const asParagraphStrings = (value: unknown, fieldName: string, filePath: string) => {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`Expected ${fieldName} to be a non-empty array in ${filePath}`)
  }

  const paragraphs = value.map((item, index) => {
    if (typeof item !== 'string' || item.trim().length === 0) {
      throw new Error(`Expected ${fieldName}[${index}] to be a non-empty string in ${filePath}`)
    }

    return item.trim()
  })

  if (paragraphs.length === 0) {
    throw new Error(`Expected ${fieldName} to contain at least one paragraph in ${filePath}`)
  }

  return paragraphs
}

const asParagraphRows = (value: unknown) => {
  if (!Array.isArray(value)) return []

  return value
    .map((item) => {
      if (typeof item === 'string') {
        return item.trim()
      }

      if (
        item &&
        typeof item === 'object' &&
        typeof (item as { text?: unknown }).text === 'string'
      ) {
        return (item as { text: string }).text.trim()
      }

      return ''
    })
    .filter((item) => item.length > 0)
}

const toParagraphRows = (paragraphs: string[]) => paragraphs.map((text) => ({ text }))

const resolveGreetingPayload = (greeting: GreetingFile, filePath: string) => {
  const introParagraphs = asParagraphStrings(greeting.introParagraphs, 'introParagraphs', filePath)
  const bodyParagraphs = asParagraphStrings(greeting.bodyParagraphs, 'bodyParagraphs', filePath)

  return {
    introParagraphs,
    bodyParagraphs,
  }
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

export const importGreetingContent = async () => {
  const { envProfile } = loadBackendScriptEnvironment(scriptsDir)
  requireExplicitProdWriteConfirmation('greeting import', envProfile)

  let payload: Payload | null = null

  try {
    const contentDir = resolvePortfolioContentDir(scriptsDir)
    const greetingPath = path.resolve(contentDir, 'greeting.yaml')

    if (!fs.existsSync(greetingPath)) {
      console.info(`No greeting file found at ${greetingPath}. Skipping greeting import.`)
      return
    }

    const greeting = readYamlFile<GreetingFile>(greetingPath)
    const { introParagraphs, bodyParagraphs } = resolveGreetingPayload(greeting, greetingPath)

    const { default: config } = await import('../../src/payload.config')
    payload = await getPayload({ config })

    const globalUpdater = payload as unknown as GreetingGlobalUpdater
    await globalUpdater.updateGlobal({
      slug: 'greeting',
      data: {
        introParagraphs: toParagraphRows(introParagraphs),
        bodyParagraphs: toParagraphRows(bodyParagraphs),
      },
    })

    console.info(`Imported greeting content from ${greetingPath}.`)
  } finally {
    if (payload) {
      await destroyPayloadWithTimeout(payload, 'greeting import')
    }
  }
}

export const exportGreetingContent = async ({ dryRun = false }: { dryRun?: boolean } = {}) => {
  loadBackendScriptEnvironment(scriptsDir)

  let payload: Payload | null = null

  try {
    const contentDir = resolvePortfolioContentDirPath(scriptsDir)
    const greetingPath = path.resolve(contentDir, 'greeting.yaml')

    const { default: config } = await import('../../src/payload.config')
    payload = await getPayload({ config })

    const greeting = (await payload.findGlobal({
      slug: 'greeting',
      depth: 0,
      overrideAccess: true,
    })) as unknown as GreetingFile

    const introParagraphs = asParagraphRows(greeting.introParagraphs)
    const bodyParagraphs = asParagraphRows(greeting.bodyParagraphs)

    const greetingSerialized = [
      serializeParagraphArrayYaml('introParagraphs', introParagraphs),
      serializeParagraphArrayYaml('bodyParagraphs', bodyParagraphs),
    ]
      .map((section) => section.trimEnd())
      .join('\n')
      .concat('\n')

    console.info(
      `${dryRun ? '[DRY RUN] ' : ''}Preparing to export greeting content to ${greetingPath}.`,
    )

    if (dryRun) {
      console.info(`Would write ${greetingPath}`)
      return
    }

    fs.mkdirSync(contentDir, { recursive: true })
    fs.writeFileSync(greetingPath, greetingSerialized, 'utf8')

    console.info(`Exported greeting content into ${greetingPath}.`)
  } finally {
    if (payload) {
      await destroyPayloadWithTimeout(payload, 'greeting export')
    }
  }
}

const runFromCli = async () => {
  const action = process.argv[2]
  const dryRun = process.argv.includes('--dry-run')

  if (action === 'import') {
    await importGreetingContent()
    return
  }

  if (action === 'export') {
    await exportGreetingContent({ dryRun })
    return
  }

  if (process.argv[1] === __filename) {
    throw new Error(`Unknown action: ${action ?? '(missing)'}. Use 'import' or 'export'.`)
  }
}

if (process.argv[1] === __filename) {
  void runFromCli()
    .then(() => {
      process.exit(0)
    })
    .catch((error) => {
      console.error('Failed to run greeting content helper:', error)
      process.exit(1)
    })
}
