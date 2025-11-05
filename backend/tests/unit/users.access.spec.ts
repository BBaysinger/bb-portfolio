import { describe, it, expect } from 'vitest'

import { Users } from '@/collections/Users'

// Minimal shapes to satisfy the access function signatures
type MockReq = { user?: { id: string; role: 'admin' | 'user' } }

describe('Users collection access rules', () => {
  it('read: returns false when unauthenticated', () => {
    const readAccess = Users.access?.read as (args: { req: MockReq }) => unknown
    const result = readAccess({ req: {} as MockReq })
    expect(result).toBe(false)
  })

  it('read: returns true for admins', () => {
    const readAccess = Users.access?.read as (args: { req: MockReq }) => unknown
    const result = readAccess({ req: { user: { id: '1', role: 'admin' } } })
    expect(result).toBe(true)
  })

  it('read: restricts non-admins to their own document', () => {
    const readAccess = Users.access?.read as (args: { req: MockReq }) => unknown
    const result = readAccess({ req: { user: { id: 'u123', role: 'user' } } })
    expect(result).toEqual({ id: { equals: 'u123' } })
  })

  it('update: returns false when unauthenticated', () => {
    const updateAccess = Users.access?.update as (args: { req: MockReq }) => unknown
    const result = updateAccess({ req: {} as MockReq })
    expect(result).toBe(false)
  })

  it('update: returns true for admins', () => {
    const updateAccess = Users.access?.update as (args: { req: MockReq }) => unknown
    const result = updateAccess({ req: { user: { id: '1', role: 'admin' } } })
    expect(result).toBe(true)
  })

  it('update: restricts non-admins to their own document', () => {
    const updateAccess = Users.access?.update as (args: { req: MockReq }) => unknown
    const result = updateAccess({ req: { user: { id: 'u123', role: 'user' } } })
    expect(result).toEqual({ id: { equals: 'u123' } })
  })
})
