import { getPayload } from 'payload'

import configPromise from '../src/payload.config'

/**
 * NDA media backfill (Payload API).
 *
 * This script boots the full Payload config and updates computed `nda` flags on upload collections.
 * It is kept as a Payload-level option, but the recommended default for local maintenance is the
 * Mongo-only variant:
 *
 *   `npm run backfill:nda-media:mongo`
 *
 * What’s left to get this script working locally (if it fails on macOS):
 * - Ensure `sharp` can load its native `libvips` dependency for your Node/arch.
 * - If you see a `sharp`/`libvips` load error, either fix the local native deps or run this
 *   script in a Linux container where `sharp` is known-good.
 */

type RelRecord = Record<string, unknown>

const asId = (rel: unknown): string | undefined => {
  if (typeof rel === 'string') return rel
  if (!rel || typeof rel !== 'object') return undefined
  const rec = rel as RelRecord
  const id = rec.id
  if (typeof id === 'string') return id
  const value = rec.value
  if (typeof value === 'string') return value
  return undefined
}

async function main() {
  const payload = await getPayload({ config: configPromise })

  const computeProjectNda = async (projectId: string | undefined): Promise<boolean> => {
    if (!projectId) return false
    const projectRes = await payload.find({
      collection: 'projects',
      where: { id: { equals: projectId } },
      limit: 1,
      depth: 0,
    })
    const project = projectRes.docs[0] as undefined | { nda?: boolean | null; brandId?: unknown }
    const projectNda = Boolean(project?.nda)
    const brandId = asId(project?.brandId)
    if (!brandId) return projectNda

    const brandRes = await payload.find({
      collection: 'brands',
      where: { id: { equals: brandId } },
      limit: 1,
      depth: 0,
    })
    const brand = brandRes.docs[0] as undefined | { nda?: boolean | null }
    const brandNda = Boolean(brand?.nda)

    return projectNda || brandNda
  }

  const backfillProjectMedia = async (collection: 'projectScreenshots' | 'projectThumbnails') => {
    let page = 1
    const limit = 200
    let updated = 0

    for (;;) {
      const res = await payload.find({
        collection,
        limit,
        page,
        depth: 0,
      })

      if (!res.docs.length) break

      for (const doc of res.docs as unknown as Array<Record<string, unknown>>) {
        const id = typeof doc.id === 'string' ? doc.id : undefined
        if (!id) continue
        const projectId = asId(doc.project)
        const nda = await computeProjectNda(projectId)
        if (Boolean(doc.nda) !== nda) {
          await payload.update({
            collection,
            id,
            data: { nda },
            depth: 0,
          } as Parameters<typeof payload.update>[0])
          updated++
        }
      }

      if (!res.hasNextPage) break
      page++
    }

    return updated
  }

  const backfillBrandLogos = async () => {
    // Brand logos are referenced from brands; use that relationship to set nda.
    let page = 1
    const limit = 200
    let updated = 0

    for (;;) {
      const res = await payload.find({
        collection: 'brands',
        limit,
        page,
        depth: 0,
      })
      if (!res.docs.length) break

      for (const brand of res.docs as unknown as Array<Record<string, unknown>>) {
        const nda = Boolean(brand.nda)
        const ids = [asId(brand.logoLight), asId(brand.logoDark)].filter((x): x is string => !!x)
        for (const id of ids) {
          // Best effort: update regardless of current value.
          await payload.update({
            collection: 'brandLogos',
            id,
            data: { nda },
            depth: 0,
          } as Parameters<typeof payload.update>[0])
          updated++
        }
      }

      if (!res.hasNextPage) break
      page++
    }

    return updated
  }

  const screenshots = await backfillProjectMedia('projectScreenshots')
  const thumbnails = await backfillProjectMedia('projectThumbnails')
  const brandLogos = await backfillBrandLogos()

  console.info('Backfill complete', { screenshots, thumbnails, brandLogos })
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
