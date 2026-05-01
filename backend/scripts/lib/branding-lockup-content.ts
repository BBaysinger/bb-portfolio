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

type BrandingLockupFile = {
  roleVariants?: unknown
}

type BrandingLockupGlobalUpdater = {
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

type BrandingLockupRecord = Record<string, unknown>

type PayloadWithBrandingLockupGlobal = Payload & {
  findGlobal(args: {
    slug: 'heroBranding'
    depth?: number
    overrideAccess?: boolean
  }): Promise<BrandingLockupRecord>
}

type RoleVariant = {
  presetLabel: string
  title: string
  isActive: boolean
  roleTitleClassName: string
}

const BRANDING_LOCKUP_FILE_NAME = 'branding-lockup.yaml'
const LEGACY_BRANDING_LOCKUP_FILE_NAME = 'hero-branding.yaml'

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

const resolveImportBrandingLockupPath = (contentDir: string) => {
  const primaryPath = path.resolve(contentDir, BRANDING_LOCKUP_FILE_NAME)
  if (fs.existsSync(primaryPath)) {
    return primaryPath
  }

  return path.resolve(contentDir, LEGACY_BRANDING_LOCKUP_FILE_NAME)
}

const resolveExportBrandingLockupPath = (contentDir: string) =>
  path.resolve(contentDir, BRANDING_LOCKUP_FILE_NAME)

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

export const importBrandingLockupContent = async () => {
  const { envProfile } = loadBackendScriptEnvironment(scriptsDir)
  requireExplicitProdWriteConfirmation('branding lockup import', envProfile)

  let payload: Payload | null = null

  try {
    const contentDir = resolvePortfolioContentDir(scriptsDir)
    const brandingLockupPath = resolveImportBrandingLockupPath(contentDir)

    if (!fs.existsSync(brandingLockupPath)) {
      console.info(
        `No branding lockup file found at ${brandingLockupPath}. Skipping branding lockup import.`,
      )
      return
    }

    const brandingLockup = readYamlFile<BrandingLockupFile>(brandingLockupPath)
    const roleVariants = normalizeImportedRoleVariants(
      brandingLockup.roleVariants,
      brandingLockupPath,
    )

    const { default: config } = await import('../../src/payload.config')
    payload = await getPayload({ config })

    const globalUpdater = payload as unknown as BrandingLockupGlobalUpdater
    await globalUpdater.updateGlobal({
      slug: 'heroBranding',
      data: {
        roleVariants,
      },
    })

    console.info(`Imported branding lockup content from ${brandingLockupPath}.`)
  } finally {
    if (payload) {
      await destroyPayloadWithTimeout(payload, 'branding lockup import')
    }
  }
}

export const exportBrandingLockupContent = async ({
  dryRun = false,
}: { dryRun?: boolean } = {}) => {
  loadBackendScriptEnvironment(scriptsDir)

  let payload: Payload | null = null

  try {
    const contentDir = resolvePortfolioContentDirPath(scriptsDir)
    const brandingLockupPath = resolveExportBrandingLockupPath(contentDir)

    const { default: config } = await import('../../src/payload.config')
    payload = await getPayload({ config })

    const brandingLockup = await (payload as PayloadWithBrandingLockupGlobal).findGlobal({
      slug: 'heroBranding',
      depth: 0,
      overrideAccess: true,
    })

    const brandingLockupSerialized = dumpYaml(
      {
        roleVariants: normalizeExportedRoleVariants(brandingLockup.roleVariants),
      },
      {
        lineWidth: -1,
        noRefs: true,
        quotingType: '"',
        forceQuotes: false,
      },
    )

    console.info(
      `${dryRun ? '[DRY RUN] ' : ''}Preparing to export branding lockup content to ${brandingLockupPath}.`,
    )

    if (dryRun) {
      console.info(`Would write ${brandingLockupPath}`)
      return
    }

    fs.mkdirSync(contentDir, { recursive: true })
    fs.writeFileSync(brandingLockupPath, brandingLockupSerialized, 'utf8')

    console.info(`Exported branding lockup content into ${brandingLockupPath}.`)
  } finally {
    if (payload) {
      await destroyPayloadWithTimeout(payload, 'branding lockup export')
    }
  }
}

const runFromCli = async () => {
  const action = process.argv[2]
  const dryRun = process.argv.includes('--dry-run')

  if (action === 'import') {
    await importBrandingLockupContent()
    return
  }

  if (action === 'export') {
    await exportBrandingLockupContent({ dryRun })
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
      console.error('Failed to run branding lockup content helper:', error)
      process.exit(1)
    })
}
