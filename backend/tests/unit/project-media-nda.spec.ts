import type { PayloadRequest } from 'payload'
import { describe, expect, it, vi } from 'vitest'

import { ProjectBrands } from '@/collections/Brands'
import { ProjectScreenshots } from '@/collections/ProjectScreenshots'
import { propagateProjectMediaNda } from '@/utils/projectMediaNda'

type FindArgs = {
  collection: string
  where?: unknown
  limit?: number
  depth?: number
  overrideAccess?: boolean
  disableErrors?: boolean
}

type UpdateArgs = {
  collection: string
  id: string
  data: Record<string, unknown>
  depth?: number
  overrideAccess?: boolean
}

type MockPayload = {
  find: ReturnType<typeof vi.fn<(...args: [FindArgs]) => Promise<{ docs: unknown[] }>>>
  update: ReturnType<typeof vi.fn<(...args: [UpdateArgs]) => Promise<unknown>>>
}

const toPayload = (payload: MockPayload): PayloadRequest['payload'] =>
  payload as unknown as PayloadRequest['payload']

const toPayloadReq = (payload: MockPayload): PayloadRequest =>
  ({ payload: toPayload(payload) }) as unknown as PayloadRequest

describe('project media NDA helpers', () => {
  it('propagateProjectMediaNda updates both media collections from the current project NDA state', async () => {
    const find = vi.fn(async ({ collection }: FindArgs) => {
      switch (collection) {
        case 'projects':
          return { docs: [{ id: 'project-1', nda: true, brandId: 'brand-1' }] }
        case 'project-brands':
          return { docs: [{ id: 'brand-1', nda: false }] }
        case 'projectScreenshots':
          return { docs: [{ id: 'screen-1', nda: false }] }
        case 'projectThumbnails':
          return { docs: [{ id: 'thumb-1', nda: false }] }
        default:
          return { docs: [] }
      }
    })
    const update = vi.fn(async () => ({}))

    await propagateProjectMediaNda(toPayload({ find, update }), 'project-1')

    expect(update).toHaveBeenCalledTimes(2)
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'projectScreenshots',
        id: 'screen-1',
        data: { nda: true },
        overrideAccess: true,
      }),
    )
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'projectThumbnails',
        id: 'thumb-1',
        data: { nda: true },
        overrideAccess: true,
      }),
    )
  })

  it('media beforeChange rejects writes when the linked project cannot be resolved', async () => {
    const beforeChange = ProjectScreenshots.hooks?.beforeChange?.[0] as unknown as (args: {
      data: unknown
      req: PayloadRequest
      context?: Record<string, unknown>
    }) => Promise<unknown>

    const find = vi.fn(async ({ collection }: FindArgs) => {
      if (collection === 'projects') return { docs: [] }
      return { docs: [] }
    })

    await expect(
      beforeChange({
        data: { project: 'missing-project' },
        req: toPayloadReq({ find, update: vi.fn(async () => ({})) }),
        context: {},
      }),
    ).rejects.toThrow(/Unable to resolve project missing-project/)
  })

  it('brand afterChange propagates NDA flips to all related project media', async () => {
    const afterChange = ProjectBrands.hooks?.afterChange?.[0] as unknown as (args: {
      doc: unknown
      req: PayloadRequest
    }) => Promise<unknown>

    const find = vi.fn(async ({ collection, where }: FindArgs) => {
      switch (collection) {
        case 'projects': {
          const whereString = JSON.stringify(where || {})
          if (whereString.includes('brand-1')) {
            return { docs: [{ id: 'project-1', nda: false, brandId: 'brand-1' }] }
          }
          return { docs: [{ id: 'project-1', nda: false, brandId: 'brand-1' }] }
        }
        case 'project-brands':
          return { docs: [{ id: 'brand-1', nda: true }] }
        case 'projectScreenshots':
          return { docs: [{ id: 'screen-1', nda: false }] }
        case 'projectThumbnails':
          return { docs: [{ id: 'thumb-1', nda: false }] }
        default:
          return { docs: [] }
      }
    })
    const update = vi.fn(async () => ({}))

    await afterChange({
      doc: { id: 'brand-1', nda: true, logoLight: 'logo-1' },
      req: toPayloadReq({ find, update }),
    })

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ collection: 'brandLogos', id: 'logo-1', data: { nda: true } }),
    )
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'projectScreenshots',
        id: 'screen-1',
        data: { nda: true },
      }),
    )
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'projectThumbnails',
        id: 'thumb-1',
        data: { nda: true },
      }),
    )
  })
})
