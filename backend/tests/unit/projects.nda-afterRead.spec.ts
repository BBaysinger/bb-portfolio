import type { PayloadRequest } from 'payload'
import { describe, it, expect, vi } from 'vitest'

import { Projects } from '@/collections/Projects'

type MockPayload = {
  findByID: (args: {
    collection: string
    id: string
    depth?: number
    disableErrors?: boolean
    overrideAccess?: boolean
  }) => Promise<unknown>
}

type MockReq = {
  user?: { id: string; role: 'admin' | 'user' }
  payload: MockPayload
}

const toPayloadReq = (req: MockReq): PayloadRequest => req as unknown as PayloadRequest

describe('Projects collection NDA normalization', () => {
  it('afterRead: sets nda=true when unauthenticated and brand is NDA', async () => {
    const afterRead = Projects.hooks?.afterRead?.[0] as unknown as (args: {
      doc: unknown
      req: PayloadRequest
    }) => Promise<unknown>

    const findByID = vi.fn(async (args: { overrideAccess?: boolean }) => {
      expect(args.overrideAccess).toBe(true)
      return { nda: true }
    })

    const req: MockReq = { payload: { findByID } }
    const doc = { nda: false, brandId: 'brand123' }

    const out = (await afterRead({ doc, req: toPayloadReq(req) })) as { nda?: unknown }
    expect(out.nda).toBe(true)
  })

  it('afterRead: does nothing when authenticated', async () => {
    const afterRead = Projects.hooks?.afterRead?.[0] as unknown as (args: {
      doc: unknown
      req: PayloadRequest
    }) => Promise<unknown>

    const findByID = vi.fn(async () => ({ nda: true }))
    const req: MockReq = { user: { id: 'u1', role: 'user' }, payload: { findByID } }
    const doc = { nda: false, brandId: 'brand123' }

    const out = (await afterRead({ doc, req: toPayloadReq(req) })) as { nda?: unknown }
    expect(out.nda).toBe(false)
    expect(findByID).not.toHaveBeenCalled()
  })
})
