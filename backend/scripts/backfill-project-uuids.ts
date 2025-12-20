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

// Scripts should not keep the event loop alive. Payload's dev HMR websocket can
// do that when NODE_ENV is not production/test. Disable it for this script.
process.env.DISABLE_PAYLOAD_HMR ??= 'true'

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const isMongoLockTimeout = (err: unknown): boolean => {
  if (!err || typeof err !== 'object') return false
  const e = err as {
    code?: unknown
    codeName?: unknown
    message?: unknown
    errorLabelSet?: unknown
  }

  if (e.code === 24) return true
  if (e.codeName === 'LockTimeout') return true
  const msg = typeof e.message === 'string' ? e.message : ''
  if (msg.includes('LockTimeout')) return true
  if (msg.includes('Unable to acquire IX lock')) return true
  // Some drivers expose error labels differently; treat as transient.
  if (typeof e.errorLabelSet === 'object' && e.errorLabelSet) return true
  return false
}

async function withRetries<T>(fn: () => Promise<T>, label: string): Promise<T> {
  const maxAttempts = 8
  let lastErr: unknown

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastErr = err
      if (!isMongoLockTimeout(err) || attempt === maxAttempts) throw err

      const delayMs = 200 * attempt
      console.warn(`⏳ ${label} hit Mongo lock timeout; retrying`, { attempt, delayMs })
      await sleep(delayMs)
    }
  }

  // Should be unreachable
  throw lastErr
}

async function main() {
  console.info('🧩 Backfill project UUIDs')

  let payload: Payload | null = null

  try {
    // NOTE: Intentionally extensionless import so TypeScript doesn't require
    // `allowImportingTsExtensions`. This script is meant to be executed via `tsx`.
    const { default: configExport } = await import('../src/payload.config')
    // In Payload v3, `buildConfig` is async and `payload.config.ts` commonly
    // `export default buildConfig(...)`, which yields a Promise at runtime.
    // `getPayload` needs the resolved config.
    const config = await Promise.resolve(configExport)
    const payloadInstance = await getPayload({ config })
    payload = payloadInstance

    let page = 1
    const limit = 25
    let updated = 0
    let scanned = 0

    // Fetch only docs missing uuid where possible; Payload supports `where`.
    // Use a conservative OR so we also catch null/empty strings.
    const where: Where = {
      or: [{ uuid: { exists: false } }, { uuid: { equals: null } }, { uuid: { equals: '' } }],
    }

    while (true) {
      const res = await withRetries(
        async () =>
          payloadInstance.find({
            collection: 'projects',
            where,
            page,
            limit,
            depth: 0,
          }),
        'payload.find(projects)',
      )

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
        const updateUnsafe = (
          payloadInstance.update as unknown as (options: {
            collection: 'projects'
            id: string
            data: { uuid: string }
            depth?: number
          }) => Promise<unknown>
        ).bind(payloadInstance)

        await withRetries(
          async () =>
            updateUnsafe({
              collection: 'projects',
              id,
              data: { uuid: randomUUID() },
              depth: 0,
            }),
          'payload.update(projects)',
        )
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
      await payload?.destroy?.()
    } catch {
      // ignore
    }
  }
}

main()
