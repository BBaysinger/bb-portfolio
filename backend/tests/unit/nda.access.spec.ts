import type { PayloadRequest } from 'payload'
import { describe, it, expect, vi } from 'vitest'

import { canReadNdaField } from '@/access/nda'

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

describe('NDA access helpers', () => {
  it('canReadNdaField: allows when authenticated', async () => {
    const req: MockReq = {
      user: { id: 'u1', role: 'user' },
      payload: {
        findByID: vi.fn(async () => ({ nda: true })),
      },
    }

    const res = await canReadNdaField({ req: toPayloadReq(req), doc: { nda: true } })
    expect(res).toBe(true)
  })

  it('canReadNdaField: denies when doc.nda is true and unauthenticated', async () => {
    const req: MockReq = {
      payload: {
        findByID: vi.fn(async () => ({ nda: false })),
      },
    }

    const res = await canReadNdaField({ req: toPayloadReq(req), doc: { nda: true } })
    expect(res).toBe(false)
  })

  it('canReadNdaField: allows when unauthenticated and no doc provided', async () => {
    const req: MockReq = {
      payload: {
        findByID: vi.fn(async () => null),
      },
    }

    const res = await canReadNdaField({ req: toPayloadReq(req) })
    expect(res).toBe(true)
  })

  it('canReadNdaField: allows when unauthenticated and doc has no NDA + no brandId', async () => {
    const req: MockReq = {
      payload: {
        findByID: vi.fn(async () => null),
      },
    }

    const res = await canReadNdaField({ req: toPayloadReq(req), doc: { nda: false } })
    expect(res).toBe(true)
  })

  it('canReadNdaField: denies when brand relation object has nda:true', async () => {
    const req: MockReq = {
      payload: {
        findByID: vi.fn(async () => null),
      },
    }

    const res = await canReadNdaField({
      req: toPayloadReq(req),
      doc: { nda: false, brandId: { nda: true } },
    })
    expect(res).toBe(false)
  })

  it('canReadNdaField: allows when brand relation object has nda:false', async () => {
    const req: MockReq = {
      payload: {
        findByID: vi.fn(async () => null),
      },
    }

    const res = await canReadNdaField({
      req: toPayloadReq(req),
      doc: { nda: false, brandId: { nda: false } },
    })
    expect(res).toBe(true)
  })

  it('canReadNdaField: denies when brand relation object lacks nda field (fail closed)', async () => {
    const req: MockReq = {
      payload: {
        findByID: vi.fn(async () => null),
      },
    }

    const res = await canReadNdaField({
      req: toPayloadReq(req),
      doc: { nda: false, brandId: { id: 'b1' } },
    })
    expect(res).toBe(false)
  })

  it('canReadNdaField: allows when brand relation object lacks nda but resolves to non-NDA brand', async () => {
    const findByID = vi.fn(async () => ({ nda: false }))
    const req: MockReq = { payload: { findByID } }

    const res = await canReadNdaField({
      req: toPayloadReq(req),
      doc: { nda: false, brandId: { id: 'b1' } },
    })

    expect(res).toBe(true)
  })

  it('canReadNdaField: denies when brandId is string and brand is NDA', async () => {
    const findByID = vi.fn(async (args: { overrideAccess?: boolean }) => {
      expect(args.overrideAccess).toBe(true)
      return { nda: true }
    })

    const req: MockReq = { payload: { findByID } }

    const res = await canReadNdaField({
      req: toPayloadReq(req),
      doc: { nda: false, brandId: 'brand123' },
    })

    expect(res).toBe(false)
  })

  it('canReadNdaField: allows when brandId is string and brand is not NDA', async () => {
    const findByID = vi.fn(async () => ({ nda: false }))

    const req: MockReq = { payload: { findByID } }

    const res = await canReadNdaField({
      req: toPayloadReq(req),
      doc: { nda: false, brandId: 'brand123' },
    })

    expect(res).toBe(true)
  })

  it('canReadNdaField: denies when brandId is string and brand cannot be fetched', async () => {
    const findByID = vi.fn(async () => null)

    const req: MockReq = { payload: { findByID } }

    const res = await canReadNdaField({
      req: toPayloadReq(req),
      doc: { nda: false, brandId: 'brand123' },
    })

    expect(res).toBe(false)
  })

  it('canReadNdaField: denies when brand lookup throws', async () => {
    const findByID = vi.fn(async () => {
      throw new Error('boom')
    })

    const req: MockReq = { payload: { findByID } }

    const res = await canReadNdaField({
      req: toPayloadReq(req),
      doc: { nda: false, brandId: 'brand123' },
    })

    expect(res).toBe(false)
  })
})
