#!/usr/bin/env tsx
/**
 * Backfill Project UUIDs
 *
 * Populates the `uuid` field for any existing `projects` documents missing it.
 *
 * Usage:
 * - From backend/: `pnpm run backfill:project-uuids`
 * - Optionally load local secrets first by setting ENVIRONMENT and using existing patterns.
 */

import { randomUUID } from 'node:crypto'

import { getPayload } from 'payload'
import type { Payload } from 'payload'
import type { Where } from 'payload'

async function main() {
  console.info('🧩 Backfill project UUIDs')

  let payload: Payload | null = null

  try {
    // NOTE: Intentionally extensionless import so TypeScript doesn't require
    // `allowImportingTsExtensions`. This script is meant to be executed via `tsx`.
    const { default: config } = await import('../src/payload.config')
    payload = await getPayload({ config })

    let page = 1
    const limit = 100
    let updated = 0
    let scanned = 0

    // Fetch only docs missing uuid where possible; Payload supports `where`.
    // Use a conservative OR so we also catch null/empty strings.
    const where: Where = {
      or: [{ uuid: { exists: false } }, { uuid: { equals: null } }, { uuid: { equals: '' } }],
    }

    while (true) {
      const res = await payload.find({
        collection: 'projects',
        where,
        page,
        limit,
        depth: 0,
      })

      const docs = res.docs || []
      if (docs.length === 0) break

      for (const doc of docs) {
        scanned++
        const docObj = doc as unknown as { id?: unknown; uuid?: unknown }
        const id = typeof docObj.id === 'string' ? docObj.id : undefined
        const uuid = typeof docObj.uuid === 'string' ? docObj.uuid : undefined
        if (!id) continue
        if (uuid && typeof uuid === 'string' && uuid.length > 0) continue

        // payload-types.ts may not yet include the new `uuid` field until
        // `payload generate:types` is run. Use an intentionally narrow
        // signature to keep the script typecheckable without `any`.
        const updateUnsafe = payload.update as unknown as (options: {
          collection: 'projects'
          id: string
          data: { uuid: string }
          depth?: number
        }) => Promise<unknown>

        await updateUnsafe({
          collection: 'projects',
          id,
          data: { uuid: randomUUID() },
          depth: 0,
        })
        updated++
      }

      page++
    }

    console.info('✅ Backfill complete', { scanned, updated })
  } catch (err) {
    console.error('❌ Backfill failed:', err)
    process.exitCode = 1
  } finally {
    try {
      await payload?.db?.destroy?.()
    } catch {
      // ignore
    }
  }
}

main()
