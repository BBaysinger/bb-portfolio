import { describe, expect, it } from 'vitest'

import { isFilesystemMediaRouteEnabled } from '@/app/media/[...path]/route'

describe('filesystem media route policy', () => {
  it('is enabled in local and test profiles', () => {
    expect(isFilesystemMediaRouteEnabled('local')).toBe(true)
    expect(isFilesystemMediaRouteEnabled('test')).toBe(true)
  })

  it('is disabled in dev and prod profiles', () => {
    expect(isFilesystemMediaRouteEnabled('dev')).toBe(false)
    expect(isFilesystemMediaRouteEnabled('prod')).toBe(false)
  })
})
