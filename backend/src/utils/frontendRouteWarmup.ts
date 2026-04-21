import type { Payload } from 'payload'

type ProjectRouteTarget = {
  slug?: unknown
  shortCode?: unknown
}

type ProjectLookupResult = {
  docs?: Array<ProjectRouteTarget>
}

const normalizeKey = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined
  const normalized = value.trim()
  return normalized.length > 0 ? normalized : undefined
}

const extractRelationId = (value: unknown): string | undefined => {
  if (typeof value === 'string') return normalizeKey(value)
  if (!value || typeof value !== 'object') return undefined

  const record = value as Record<string, unknown>
  return normalizeKey(record.id) || normalizeKey(record.value)
}

const appendProjectPaths = (paths: Set<string>, project?: ProjectRouteTarget) => {
  if (!project) return

  const slug = normalizeKey(project.slug)
  const shortCode = normalizeKey(project.shortCode)

  if (slug) {
    const encodedSlug = encodeURIComponent(slug)
    paths.add(`/project/${encodedSlug}/`)
    paths.add(`/nda-included/${encodedSlug}/`)
  }

  if (shortCode) {
    paths.add(`/nda-included/${encodeURIComponent(shortCode)}/`)
  }
}

export const buildProjectWarmPaths = (
  project?: ProjectRouteTarget,
  options: { includeHome?: boolean } = {},
): string[] => {
  const paths = new Set<string>()
  if (options.includeHome) paths.add('/')
  appendProjectPaths(paths, project)
  return Array.from(paths)
}

export const buildProjectsWarmPaths = (
  projects: ProjectRouteTarget[],
  options: { includeHome?: boolean } = {},
): string[] => {
  const paths = new Set<string>()
  if (options.includeHome) paths.add('/')
  for (const project of projects) appendProjectPaths(paths, project)
  return Array.from(paths)
}

export const loadProjectWarmTarget = async (
  payload: Payload,
  projectId: unknown,
): Promise<ProjectRouteTarget | undefined> => {
  const id = extractRelationId(projectId)
  if (!id) return undefined

  const project = await payload.findByID({
    collection: 'projects',
    id,
    depth: 0,
    overrideAccess: true,
    disableErrors: true,
  })

  if (!project || typeof project !== 'object') return undefined
  return project as ProjectRouteTarget
}

export const loadProjectsByBrand = async (
  payload: Payload,
  brandId: unknown,
): Promise<ProjectRouteTarget[]> => {
  const id = extractRelationId(brandId)
  if (!id) return []

  const result = (await payload.find({
    collection: 'projects',
    where: {
      brandId: { equals: id },
    },
    depth: 0,
    limit: 1000,
    overrideAccess: true,
    disableErrors: true,
  })) as ProjectLookupResult

  return Array.isArray(result.docs) ? result.docs : []
}
