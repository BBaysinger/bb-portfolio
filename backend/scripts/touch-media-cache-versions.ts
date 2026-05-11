#!/usr/bin/env tsx

import path from 'path'
import { fileURLToPath } from 'url'

import { getPayload, type Payload } from 'payload'

import { loadBackendScriptEnvironment } from './lib/payload-script-env'
import { requireExplicitProdWriteConfirmation } from './lib/write-guard'

type MediaCollectionSlug =
  | 'projectThumbnails'
  | 'projectScreenshots'
  | 'brandLogos'
  | 'cvExperienceLogos'

type UpdateManyResult = {
  acknowledged?: boolean
  matchedCount?: number
  modifiedCount?: number
}

type CountableModel = {
  countDocuments: (filter?: Record<string, never>) => Promise<number>
  updateMany: (
    filter: Record<string, never>,
    update: { $set: { updatedAt: Date } },
  ) => Promise<UpdateManyResult>
}

const MEDIA_COLLECTIONS: MediaCollectionSlug[] = [
  'projectThumbnails',
  'projectScreenshots',
  'brandLogos',
  'cvExperienceLogos',
]

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const hasFlag = (flag: string) => process.argv.includes(flag)

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

const { envProfile } = loadBackendScriptEnvironment(__dirname)

if (!hasFlag('--skip-confirmation')) {
  await requireExplicitProdWriteConfirmation(
    'media cache version refresh',
    envProfile,
    'refresh-media-cache-prod',
  )
}

async function main() {
  let payload: Payload | null = null

  try {
    const { default: config } = await import('../src/payload.config')
    payload = await getPayload({ config })

    const touchedAt = new Date()

    console.info(
      `Refreshing media cache versions for ${envProfile} by setting updatedAt=${touchedAt.toISOString()}.`,
    )

    for (const collection of MEDIA_COLLECTIONS) {
      const model = payload.db.collections[collection] as CountableModel | undefined

      if (!model) {
        throw new Error(`No Payload DB model found for media collection '${collection}'.`)
      }

      const total = await model.countDocuments({})
      const result = await model.updateMany(
        {},
        {
          $set: {
            updatedAt: touchedAt,
          },
        },
      )

      console.info(
        `Touched ${collection}: matched ${result.matchedCount ?? total}, modified ${result.modifiedCount ?? total}.`,
      )
    }
  } finally {
    if (payload) {
      await destroyPayloadWithTimeout(payload, 'media cache version refresh')
    }
  }
}

main().catch((error) => {
  console.error('Failed to refresh media cache versions.', error)
  process.exit(1)
})
