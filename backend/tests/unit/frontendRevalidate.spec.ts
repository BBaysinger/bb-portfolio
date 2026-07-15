import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  createFrontendRevalidateTrigger,
  createScheduledFrontendRevalidateTrigger,
} from '../../src/utils/frontendRevalidate'

const target = {
  label: 'test',
  path: '/api/revalidate/test',
  secretEnv: 'FRONTEND_TEST_REVALIDATE_SECRET',
}

const originalEnv = { ...process.env }

afterEach(() => {
  process.env = { ...originalEnv }
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('frontend revalidation delivery', () => {
  it('fails loudly when a nonlocal endpoint is missing', async () => {
    process.env.ENV_PROFILE = 'dev'
    delete process.env.FRONTEND_INTERNAL_URL
    delete process.env.FRONTEND_URL
    delete process.env.PUBLIC_SERVER_URL
    delete process.env.FRONTEND_PROJECTS_REVALIDATE_URL

    await expect(createFrontendRevalidateTrigger(target)('content.changed')).rejects.toThrow(
      'No frontend test revalidation endpoint is configured',
    )
  })

  it('fails loudly when every configured endpoint rejects the request', async () => {
    process.env.ENV_PROFILE = 'dev'
    process.env.FRONTEND_INTERNAL_URL = 'http://frontend:3000'
    process.env.FRONTEND_TEST_REVALIDATE_SECRET = 'secret'
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('no', { status: 500 })))

    await expect(createFrontendRevalidateTrigger(target)('content.changed')).rejects.toThrow(
      'failed for all configured endpoints',
    )
  })

  it('coalesces scheduled changes and resolves only after delivery', async () => {
    vi.useFakeTimers()
    const trigger = vi.fn().mockResolvedValue(undefined)
    const schedule = createScheduledFrontendRevalidateTrigger(trigger, 10)

    const first = schedule('first', { warmPaths: ['/one'] })
    const second = schedule('second', { warmPaths: ['/two'] })

    expect(trigger).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(10)
    await Promise.all([first, second])

    expect(trigger).toHaveBeenCalledOnce()
    expect(trigger).toHaveBeenCalledWith('first, second', {
      warmPaths: ['/one', '/two'],
    })
  })
})
