import type { PayloadRequest } from 'payload'

type RelRecord = Record<string, unknown>

type ProjectDoc = {
  id?: string
  nda?: boolean | null
  brandId?: unknown
}

type BrandDoc = {
  nda?: boolean | null
}

type MediaDoc = {
  id?: string
  nda?: boolean | null
}

type PayloadLike = PayloadRequest['payload']
type FindLike = Pick<PayloadLike, 'find'>

const MEDIA_COLLECTIONS = ['projectScreenshots', 'projectThumbnails'] as const

const getRelValueString = (rel: unknown): string | undefined => {
  if (!rel || typeof rel !== 'object') return undefined
  const rec = rel as RelRecord
  const value = rec.value
  if (typeof value === 'string' && value.length > 0) return value
  const id = rec.id
  if (typeof id === 'string' && id.length > 0) return id
  return undefined
}

const findProjectById = async (payload: FindLike, projectId: string): Promise<ProjectDoc> => {
  const existing = await payload.find({
    collection: 'projects',
    where: { id: { equals: projectId } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
    disableErrors: true,
  })

  const project = existing?.docs?.[0] as ProjectDoc | undefined
  if (!project) {
    throw new Error(`Unable to resolve project ${projectId} while computing media NDA state.`)
  }

  return project
}

const findBrandById = async (payload: FindLike, brandId: string): Promise<BrandDoc> => {
  const brandRes = await payload.find({
    collection: 'project-brands',
    where: { id: { equals: brandId } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
    disableErrors: true,
  })

  const brand = brandRes?.docs?.[0] as BrandDoc | undefined
  if (!brand) {
    throw new Error(`Unable to resolve project brand ${brandId} while computing media NDA state.`)
  }

  return brand
}

export async function computeProjectMediaNda(
  req: Pick<PayloadRequest, 'payload'>,
  projectId: string | undefined,
): Promise<boolean> {
  if (!projectId) return false

  const project = await findProjectById(req.payload, projectId)
  const projectNda = Boolean(project.nda)
  const brandIdRaw = project.brandId
  const brandId = typeof brandIdRaw === 'string' ? brandIdRaw : getRelValueString(brandIdRaw)

  if (!brandId) return projectNda

  const brand = await findBrandById(req.payload, brandId)
  return projectNda || Boolean(brand.nda)
}

async function updateMediaCollectionNda(
  payload: PayloadLike,
  collection: (typeof MEDIA_COLLECTIONS)[number],
  projectId: string,
  nda: boolean,
) {
  const existing = await payload.find({
    collection,
    where: { project: { equals: projectId } },
    limit: 1000,
    depth: 0,
    overrideAccess: true,
    disableErrors: true,
  })

  const updateUnsafe = payload.update as unknown as (args: {
    collection: string
    id: string
    data: Record<string, unknown>
    depth?: number
    overrideAccess?: boolean
  }) => Promise<unknown>

  for (const doc of (existing?.docs || []) as MediaDoc[]) {
    if (!doc?.id || doc.nda === nda) continue
    await updateUnsafe({
      collection,
      id: doc.id,
      data: { nda },
      depth: 0,
      overrideAccess: true,
    })
  }
}

export async function propagateProjectMediaNda(
  payload: PayloadLike,
  projectId: string | undefined,
): Promise<void> {
  if (!projectId) return

  let nda = true
  try {
    nda = await computeProjectMediaNda({ payload } as Pick<PayloadRequest, 'payload'>, projectId)
  } catch (error) {
    console.warn('[projectMediaNda] failed to resolve NDA state, locking related media:', {
      projectId,
      error,
    })
  }

  for (const collection of MEDIA_COLLECTIONS) {
    await updateMediaCollectionNda(payload, collection, projectId, nda)
  }
}

export async function propagateBrandProjectsMediaNda(
  payload: PayloadLike,
  brandId: string | undefined,
): Promise<void> {
  if (!brandId) return

  const projects = await payload.find({
    collection: 'projects',
    where: { brandId: { equals: brandId } },
    limit: 1000,
    depth: 0,
    overrideAccess: true,
    disableErrors: true,
  })

  for (const project of (projects?.docs || []) as ProjectDoc[]) {
    await propagateProjectMediaNda(payload, project.id)
  }
}
