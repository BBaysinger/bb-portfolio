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

type RoleVariantInput = {
  presetLabel?: unknown
  title?: unknown
  isActive?: unknown
  roleTitleClassName?: unknown
}

type HeroBrandingFile = {
  roleVariants?: unknown
}

type HeroBrandingGlobalUpdater = {
  updateGlobal: (args: {
    slug: string
    data: {
      roleVariants: Array<{
        presetLabel: string
        title: string
        isActive: boolean
        roleTitleClassName: string
      }>
    }
  }) => Promise<unknown>
}

type HeroBrandingRecord = Record<string, unknown>

type PayloadWithHeroBrandingGlobal = Payload & {
  findGlobal(args: {
    slug: 'heroBranding'
    depth?: number
    overrideAccess?: boolean
  }): Promise<HeroBrandingRecord>
}

type RoleVariant = {
  presetLabel: string
  title: string
  isActive: boolean
  roleTitleClassName: string
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

const asRoleTitleClassName = (value: unknown, fieldName: string, filePath: string) => {
  const normalized = asNonEmptyString(value, fieldName, filePath)

  if (!['FEDev', 'UIDev', 'FEUIDev'].includes(normalized)) {
    throw new Error(
      `Expected ${fieldName} in ${filePath} to be one of FEDev, UIDev, FEUIDev. Received '${normalized}'.`,
    )
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

const normalizeImportedRoleVariants = (value: unknown, filePath: string) => {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`Expected roleVariants to be a non-empty array in ${filePath}`)
  }

  return value.map((entry, index) => {
    if (!entry || typeof entry !== 'object') {
      throw new Error(`Expected roleVariants[${index}] to be an object in ${filePath}`)
    }

    const roleVariant = entry as RoleVariantInput

    return {
      presetLabel: asNonEmptyString(
        roleVariant.presetLabel,
        `roleVariants[${index}].presetLabel`,
        filePath,
      ),
      title: asNonEmptyString(roleVariant.title, `roleVariants[${index}].title`, filePath),
      isActive: roleVariant.isActive === true,
      roleTitleClassName: asRoleTitleClassName(
        roleVariant.roleTitleClassName,
        `roleVariants[${index}].roleTitleClassName`,
        filePath,
      ),
    }
  })
}

const normalizeExportedRoleVariants = (value: unknown): RoleVariant[] => {
  if (!Array.isArray(value)) return []

  return value
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null

      const roleVariant = entry as Record<string, unknown>
      const presetLabel = asTrimmedString(roleVariant.presetLabel)
      const title = asTrimmedString(roleVariant.title)
      const roleTitleClassName = asTrimmedString(roleVariant.roleTitleClassName)

      if (!presetLabel || !title || !roleTitleClassName) {
        return null
      }

      return {
        presetLabel,
        title,
        isActive: roleVariant.isActive === true,
        roleTitleClassName,
      }
    })
    .filter((entry): entry is RoleVariant => Boolean(entry))
}

export const importHeroBrandingContent = async () => {
  const { envProfile } = loadBackendScriptEnvironment(scriptsDir)
  requireExplicitProdWriteConfirmation('hero branding import', envProfile)

  let payload: Payload | null = null

  try {
    const contentDir = resolvePortfolioContentDir(scriptsDir)
    const heroBrandingPath = path.resolve(contentDir, 'hero-branding.yaml')

    if (!fs.existsSync(heroBrandingPath)) {
      console.info(
        `No hero branding file found at ${heroBrandingPath}. Skipping hero branding import.`,
      )
      return
    }

    const heroBranding = readYamlFile<HeroBrandingFile>(heroBrandingPath)
    const roleVariants = normalizeImportedRoleVariants(heroBranding.roleVariants, heroBrandingPath)

    const { default: config } = await import('../../src/payload.config')
    payload = await getPayload({ config })

    const globalUpdater = payload as unknown as HeroBrandingGlobalUpdater
    await globalUpdater.updateGlobal({
      slug: 'heroBranding',
      data: {
        roleVariants,
      },
    })

    console.info(`Imported hero branding content from ${heroBrandingPath}.`)
  } finally {
    if (payload) {
      await destroyPayloadWithTimeout(payload, 'hero branding import')
    }
  }
}

export const exportHeroBrandingContent = async ({ dryRun = false }: { dryRun?: boolean } = {}) => {
  loadBackendScriptEnvironment(scriptsDir)

  let payload: Payload | null = null

  try {
    const contentDir = resolvePortfolioContentDirPath(scriptsDir)
    const heroBrandingPath = path.resolve(contentDir, 'hero-branding.yaml')

    const { default: config } = await import('../../src/payload.config')
    payload = await getPayload({ config })

    const heroBranding = await (payload as PayloadWithHeroBrandingGlobal).findGlobal({
      slug: 'heroBranding',
      depth: 0,
      overrideAccess: true,
    })

    const heroBrandingSerialized = dumpYaml(
      {
        roleVariants: normalizeExportedRoleVariants(heroBranding.roleVariants),
      },
      {
        lineWidth: -1,
        noRefs: true,
        quotingType: '"',
        forceQuotes: false,
      },
    )

    console.info(
      `${dryRun ? '[DRY RUN] ' : ''}Preparing to export hero branding content to ${heroBrandingPath}.`,
    )

    if (dryRun) {
      console.info(`Would write ${heroBrandingPath}`)
      return
    }

    fs.mkdirSync(contentDir, { recursive: true })
    fs.writeFileSync(heroBrandingPath, heroBrandingSerialized, 'utf8')

    console.info(`Exported hero branding content into ${heroBrandingPath}.`)
  } finally {
    if (payload) {
      await destroyPayloadWithTimeout(payload, 'hero branding export')
    }
  }
}

const runFromCli = async () => {
  const action = process.argv[2]
  const dryRun = process.argv.includes('--dry-run')

  if (action === 'import') {
    await importHeroBrandingContent()
    return
  }

  if (action === 'export') {
    await exportHeroBrandingContent({ dryRun })
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
      console.error('Failed to run hero branding content helper:', error)
      process.exit(1)
    })
}
