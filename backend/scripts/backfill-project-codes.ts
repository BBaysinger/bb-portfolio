#!/usr/bin/env tsx
/**
 * Backfill Project Short Codes + Slugs
 *
 * Populates the `shortCode` field for any existing `projects` documents missing it,
 * and (optionally) normalizes slugs to `${slugify(title)}-${shortCode}`.
 *
 * Usage:
 * - From backend/: `pnpm run backfill:project-codes`
 */

import path from 'path'

import dotenv from 'dotenv'
import type { Payload, Where } from 'payload'
import { getPayload } from 'payload'
import slugify from 'slugify'

import { generateShortCode } from '../src/utils/shortCode'

// Scripts should not keep the event loop alive. Payload's dev HMR websocket can
// do that when NODE_ENV is not production/test. Disable it for this script.
process.env.DISABLE_PAYLOAD_HMR ??= 'true'
// This script does not touch uploads; allow running on hosts without sharp/libvips.
process.env.PAYLOAD_DISABLE_SHARP ??= 'true'

// Load env files for local execution (tsx does not automatically load Next.js-style .env files).
// Precedence: .env.local overrides .env.
dotenv.config({ path: path.resolve(process.cwd(), '.env'), override: false })
dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: true })

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

const buildSlugFromTitle = (title: string): string => {
  return slugify(title, {
    lower: true,
    strict: true,
    trim: true,
  })
}

async function main() {
  console.info('🧩 Backfill project short codes + slugs')

  let payload: Payload | null = null

  try {
    // NOTE: Intentionally extensionless import so TypeScript doesn't require
    // `allowImportingTsExtensions`. This script is meant to be executed via `tsx`.
    const { default: configExport } = await import('../src/payload.config')
    const config = await Promise.resolve(configExport)
    const payloadInstance = await getPayload({ config })
    payload = payloadInstance

    let page = 1
    const limit = 25
    let updated = 0
    let scanned = 0

    // Only backfill documents missing shortCode and/or slug.
    const where: Where = {
      or: [
        { shortCode: { exists: false } },
        { shortCode: { equals: null } },
        { shortCode: { equals: '' } },
        { slug: { exists: false } },
        { slug: { equals: null } },
        { slug: { equals: '' } },
      ],
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
            overrideAccess: true,
          }),
        'payload.find(projects)',
      )

      const docs = res.docs || []
      if (docs.length === 0) break

      for (const doc of docs) {
        scanned++

        const docObj = doc as unknown as {
          id?: unknown
          shortCode?: unknown
          title?: unknown
          slug?: unknown
        }

        const id = typeof docObj.id === 'string' ? docObj.id : undefined
        if (!id) continue

        const existingCode = typeof docObj.shortCode === 'string' ? docObj.shortCode.trim() : ''
        const existingSlug = typeof docObj.slug === 'string' ? docObj.slug.trim() : ''

        let shortCode = existingCode
        if (!shortCode) {
          // Ensure uniqueness (rare but worth handling).
          const maxAttempts = 25
          for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            const candidate = generateShortCode(10)
            const collision = await withRetries(
              async () =>
                payloadInstance.find({
                  collection: 'projects',
                  where: { shortCode: { equals: candidate } },
                  depth: 0,
                  limit: 1,
                  overrideAccess: true,
                }),
              'payload.find(projects shortCode collision check)',
            )
            if (!collision.docs?.length) {
              shortCode = candidate
              break
            }
          }

          if (!shortCode) {
            throw new Error(`Failed to generate unique shortCode for project ${id}`)
          }
        }

        let desiredSlug = existingSlug
        if (!desiredSlug) {
          const title = typeof docObj.title === 'string' ? docObj.title.trim() : ''
          if (title) desiredSlug = buildSlugFromTitle(title)
        }

        // Never rewrite an existing slug; only fill when missing.
        const shouldUpdateSlug = !existingSlug && Boolean(desiredSlug)

        // payload-types.ts may not yet include the new field until `payload generate:types` is run.
        const updateUnsafe = (
          payloadInstance.update as unknown as (options: {
            collection: 'projects'
            id: string
            data: { shortCode?: string; slug?: string }
            depth?: number
            overrideAccess?: boolean
          }) => Promise<unknown>
        ).bind(payloadInstance)

        const data: { shortCode?: string; slug?: string } = {}
        if (!existingCode) data.shortCode = shortCode
        if (shouldUpdateSlug) data.slug = desiredSlug

        if (!Object.keys(data).length) continue

        await withRetries(
          async () =>
            updateUnsafe({
              collection: 'projects',
              id,
              data,
              depth: 0,
              overrideAccess: true,
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
