import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

import mongoose from 'mongoose'

const TAG = '[backfill:nda-media:mongo]'

type ObjectIdLike = {
  toHexString?: () => unknown
  toString?: () => unknown
}

type BulkUpdateOne = {
  updateOne: {
    filter: Record<string, unknown>
    update: Record<string, unknown>
    upsert?: boolean
  }
}

async function loadDotEnvIfPresent() {
  // Mirror backend/scripts/check-required-env.ts precedence.
  const rootDir = resolve(import.meta.dirname, '..')
  const nodeEnv = (process.env.NODE_ENV || 'development').toLowerCase()

  const envFiles = [
    resolve(rootDir, '.env'),
    nodeEnv === 'production'
      ? resolve(rootDir, '.env.production')
      : resolve(rootDir, '.env.development'),
    resolve(rootDir, '.env.local'),
  ]

  const existing = envFiles.filter((p) => existsSync(p))
  if (!existing.length) return

  try {
    const dotenvMod = await import('dotenv')
    const dotenv = (dotenvMod.default || dotenvMod) as {
      config: (options: { path: string; override: boolean }) => void
    }
    for (const filePath of existing) {
      dotenv.config({ path: filePath, override: false })
    }
  } catch {
    // If dotenv isn't available for any reason, just proceed with process.env
  }
}

const asObjectIdHex = (value: unknown): string | undefined => {
  if (!value) return undefined

  // Already an ObjectId
  if (value instanceof mongoose.Types.ObjectId) {
    return value.toHexString()
  }

  // String ObjectId
  if (typeof value === 'string') {
    const s = value.trim()
    if (!s) return undefined
    if (mongoose.isValidObjectId(s)) {
      return new mongoose.Types.ObjectId(s).toHexString()
    }
    return undefined
  }

  // ObjectId-like
  if (typeof value === 'object') {
    const obj = value as ObjectIdLike
    try {
      const maybe = obj.toHexString?.()
      if (typeof maybe === 'string' && maybe) return maybe
    } catch {
      // ignore
    }
    try {
      const s = obj.toString?.()
      if (typeof s === 'string' && mongoose.isValidObjectId(s)) {
        return new mongoose.Types.ObjectId(s).toHexString()
      }
    } catch {
      // ignore
    }
  }

  return undefined
}

async function resolveCollectionName(preferred: string): Promise<string> {
  const db = mongoose.connection.db
  if (!db) throw new Error('MongoDB connection not initialized')

  const cols = await db.listCollections().toArray()
  const names = cols.map((c) => c.name)
  const direct = names.find((n) => n === preferred)
  if (direct) return direct
  const lowered = preferred.toLowerCase()
  const ci = names.find((n) => n.toLowerCase() === lowered)
  if (ci) return ci

  throw new Error(
    `${TAG} Could not find collection "${preferred}" (case-insensitive). Existing includes: ${names
      .slice(0, 30)
      .join(', ')}${names.length > 30 ? ', ...' : ''}`,
  )
}

async function bulkSetNdaByDocId(opts: {
  collectionName: string
  ndaByDocId: Map<string, boolean>
}): Promise<{ total: number; updated: number; missingDoc: number }> {
  const { collectionName, ndaByDocId } = opts

  const db = mongoose.connection.db
  if (!db) throw new Error('MongoDB connection not initialized')

  const resolved = await resolveCollectionName(collectionName)
  if (resolved !== collectionName) {
    console.info(`${TAG} Using physical collection`, {
      logical: collectionName,
      physical: resolved,
    })
  }
  const col = db.collection(resolved)

  const ids = Array.from(ndaByDocId.keys())
  const total = ids.length
  let updated = 0
  let missingDoc = 0

  let ops: BulkUpdateOne[] = []
  const flush = async () => {
    if (!ops.length) return
    const res = await col.bulkWrite(ops, { ordered: false })
    updated += res.modifiedCount || 0
    ops = []
  }

  // Optional: pre-check existence in batches to report missing IDs.
  // This keeps reporting accurate without scanning the full collection.
  const exists = new Set<string>()
  for (let i = 0; i < ids.length; i += 500) {
    const batch = ids.slice(i, i + 500)
    const objectIds: mongoose.Types.ObjectId[] = batch.flatMap((id) => {
      try {
        return [new mongoose.Types.ObjectId(id)]
      } catch {
        return []
      }
    })
    if (!objectIds.length) continue
    const found = (await col
      .find({ _id: { $in: objectIds } } as Record<string, unknown>, {
        projection: { _id: 1 },
      })
      .toArray()) as unknown as Array<Record<string, unknown>>
    for (const d of found) {
      const hex = asObjectIdHex(d._id)
      if (hex) exists.add(hex)
    }
  }

  for (const id of ids) {
    if (!exists.has(id)) {
      missingDoc++
      continue
    }
    const nda = Boolean(ndaByDocId.get(id))
    ops.push({
      updateOne: {
        filter: { _id: new mongoose.Types.ObjectId(id) },
        update: { $set: { nda } },
      },
    })
    if (ops.length >= 500) await flush()
  }

  await flush()
  return { total, updated, missingDoc }
}

async function main() {
  await loadDotEnvIfPresent()

  const mongoURL = (process.env.MONGODB_URI || '').trim()
  if (!mongoURL) {
    throw new Error(`${TAG} Missing MONGODB_URI. Set it in backend/.env or your shell.`)
  }

  await mongoose.connect(mongoURL)

  const db = mongoose.connection.db
  if (!db) throw new Error('MongoDB connection not initialized')

  // Build brand NDA map + bulk update brand logos
  const brandsCol = await resolveCollectionName('brands')
  const projectsCol = await resolveCollectionName('projects')
  const brandLogosCol = await resolveCollectionName('brandLogos')

  const brands = await db
    .collection(brandsCol)
    .find(
      {},
      {
        projection: {
          _id: 1,
          nda: 1,
          logoLight: 1,
          logoDark: 1,
        },
      },
    )
    .toArray()

  const brandNdaById = new Map<string, boolean>()
  const brandLogoOps: BulkUpdateOne[] = []

  for (const brand of brands as unknown as Array<Record<string, unknown>>) {
    const brandId = asObjectIdHex(brand._id)
    if (!brandId) continue
    const nda = Boolean(brand.nda)
    brandNdaById.set(brandId, nda)

    const logoIds = [asObjectIdHex(brand.logoLight), asObjectIdHex(brand.logoDark)].filter(
      (x): x is string => !!x,
    )

    for (const id of logoIds) {
      try {
        brandLogoOps.push({
          updateOne: {
            filter: { _id: new mongoose.Types.ObjectId(id) },
            update: { $set: { nda } },
            upsert: false,
          },
        })
      } catch {
        // If id isn't a valid ObjectId string, skip.
      }
    }
  }

  let brandLogosUpdated = 0
  if (brandLogoOps.length) {
    const res = await db.collection(brandLogosCol).bulkWrite(brandLogoOps, { ordered: false })
    brandLogosUpdated = res.modifiedCount || 0
  }

  // Build project NDA map (project NDA OR brand NDA)
  const projects = await db
    .collection(projectsCol)
    .find(
      {},
      {
        projection: {
          _id: 1,
          nda: 1,
          brandId: 1,
          screenshots: 1,
          thumbnail: 1,
          lockedThumbnail: 1,
        },
      },
    )
    .toArray()

  const projectNdaById = new Map<string, boolean>()
  const screenshotNdaByDocId = new Map<string, boolean>()
  const thumbnailNdaByDocId = new Map<string, boolean>()
  const lockedThumbnailIds = new Set<string>()

  const toIdList = (val: unknown): string[] => {
    if (!val) return []
    if (Array.isArray(val)) {
      return val.map((x) => asObjectIdHex(x)).filter((x): x is string => !!x)
    }
    const one = asObjectIdHex(val)
    return one ? [one] : []
  }

  for (const project of projects as unknown as Array<Record<string, unknown>>) {
    const projectId = asObjectIdHex(project._id)
    if (!projectId) continue
    const projectNda = Boolean(project.nda)
    const brandId = asObjectIdHex(project.brandId)
    const brandNda = brandId ? Boolean(brandNdaById.get(brandId)) : false

    const requiresNda = projectNda || brandNda
    projectNdaById.set(projectId, requiresNda)

    // Reverse-map media docs by reading the authoritative relationship fields on projects.
    // This handles legacy media docs that may not have the new backreference fields (e.g. media.project).
    for (const sid of toIdList(project.screenshots)) {
      screenshotNdaByDocId.set(sid, requiresNda)
    }
    for (const tid of toIdList(project.thumbnail)) {
      thumbnailNdaByDocId.set(tid, requiresNda)
    }
    for (const lid of toIdList(project.lockedThumbnail)) {
      lockedThumbnailIds.add(lid)
      // Locked thumbnails must remain public-safe.
      thumbnailNdaByDocId.set(lid, false)
    }
  }

  // Apply NDA flags to media docs based on project relationships.
  const screenshots = await bulkSetNdaByDocId({
    collectionName: 'projectScreenshots',
    ndaByDocId: screenshotNdaByDocId,
  })

  // Ensure locked thumbnails are forced to nda=false even if referenced by NDA projects.
  const thumbnails = await bulkSetNdaByDocId({
    collectionName: 'projectThumbnails',
    ndaByDocId: thumbnailNdaByDocId,
  })

  console.info(`${TAG} Backfill complete`, {
    brands: brands.length,
    projects: projects.length,
    brandLogosUpdated,
    mapped: {
      screenshots: screenshotNdaByDocId.size,
      thumbnails: thumbnailNdaByDocId.size,
      lockedThumbnails: lockedThumbnailIds.size,
    },
    screenshots,
    thumbnails,
  })
}

main()
  .catch((err) => {
    console.error(`${TAG} Failed`, err)
    process.exitCode = 1
  })
  .finally(async () => {
    try {
      await mongoose.disconnect()
    } catch {
      // ignore
    }
  })
