import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

import { dump as dumpYaml } from 'js-yaml'
import { getPayload, type Payload } from 'payload'

import { loadBackendScriptEnvironment } from './payload-script-env'
import {
  readYamlFile,
  resolvePortfolioContentDir,
  resolvePortfolioContentDirPath,
} from './portfolio-content'
import { requireExplicitProdWriteConfirmation } from './write-guard'

type GreetingFile = {
  greetingIntroHtml?: unknown
  greetingBodyHtml?: unknown
}

type GreetingGlobalUpdater = {
  updateGlobal: (args: {
    slug: string
    data: {
      greetingIntroHtml: string
      greetingBodyHtml: string
    }
  }) => Promise<unknown>
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const scriptsDir = path.resolve(__dirname, '..')

const asNonEmptyString = (value: unknown, fieldName: string, filePath: string) => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Expected ${fieldName} to be a non-empty string in ${filePath}`)
  }

  return value.trim()
}

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
    const greetingIntroHtml = asNonEmptyString(
      greeting.greetingIntroHtml,
      'greetingIntroHtml',
      greetingPath,
    )
    const greetingBodyHtml = asNonEmptyString(
      greeting.greetingBodyHtml,
      'greetingBodyHtml',
      greetingPath,
    )

    const { default: config } = await import('../../src/payload.config')
    payload = await getPayload({ config })

    const globalUpdater = payload as unknown as GreetingGlobalUpdater
    await globalUpdater.updateGlobal({
      slug: 'heroBranding',
      data: {
        greetingIntroHtml,
        greetingBodyHtml,
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
      slug: 'heroBranding',
      depth: 0,
      overrideAccess: true,
    })) as unknown as GreetingFile

    const greetingSerialized = dumpYaml(
      {
        greetingIntroHtml: asTrimmedString(greeting.greetingIntroHtml),
        greetingBodyHtml: asTrimmedString(greeting.greetingBodyHtml),
      },
      {
        lineWidth: -1,
        noRefs: true,
        quotingType: '"',
        forceQuotes: false,
      },
    )

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
