#!/usr/bin/env tsx

import path from 'path'
import { fileURLToPath } from 'url'

import { getPayload, type Payload } from 'payload'

import { loadBackendScriptEnvironment } from './lib/payload-script-env'
import { requireExplicitProdWriteConfirmation } from './lib/write-guard'

type ContactInfoDoc = {
  contactEmail?: string | null
}

const getArgValue = (flag: string): string | undefined => {
  const index = process.argv.indexOf(flag)
  if (index === -1) return undefined
  return process.argv[index + 1]
}

const normalizeEmail = (value: string | undefined): string => {
  if (typeof value !== 'string') {
    throw new Error(
      "Missing --email. Provide the new contact email, e.g. --email 'me@example.com'.",
    )
  }

  const trimmed = value.trim()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    throw new Error(`Invalid email address: '${value}'.`)
  }

  return trimmed
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

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const { envProfile } = loadBackendScriptEnvironment(__dirname)

const isPrintOnly = process.argv.includes('--print')

if (!isPrintOnly && envProfile === 'dev' && process.env.ALLOW_DEV_WRITE !== 'true') {
  throw new Error('Refusing to write to dev: set ALLOW_DEV_WRITE=true to continue.')
}

if (!isPrintOnly) {
  await requireExplicitProdWriteConfirmation(
    'contact info update',
    envProfile,
    'update-contact-info-prod',
  )
}

async function main() {
  let payload: Payload | null = null

  try {
    const { default: config } = await import('@payload-config')
    payload = await getPayload({ config })

    const current = (await payload.findGlobal({
      slug: 'contactInfo',
      overrideAccess: true,
    })) as ContactInfoDoc

    console.info(`[${envProfile}] Current contact email: ${current.contactEmail ?? '(unset)'}`)

    if (isPrintOnly) {
      return
    }

    const nextEmail = normalizeEmail(getArgValue('--email'))

    if (nextEmail === current.contactEmail) {
      console.info(
        `[${envProfile}] Contact email already set to '${nextEmail}'. No change applied.`,
      )
      return
    }

    await payload.updateGlobal({
      slug: 'contactInfo',
      data: {
        contactEmail: nextEmail,
      },
      overrideAccess: true,
    })

    console.info(`[${envProfile}] Updated contact email to '${nextEmail}'.`)
  } catch (error) {
    console.error('Failed to update contact info:', error)
    process.exitCode = 1
  } finally {
    if (payload) {
      await destroyPayloadWithTimeout(payload, 'contact info update')
    }
  }
}

void main()
  .then(() => {
    process.exit(process.exitCode ?? 0)
  })
  .catch((error) => {
    console.error('Failed to update contact info:', error)
    process.exit(1)
  })
