import { getPayload, Payload } from 'payload'
import { describe, it, beforeAll, expect } from 'vitest'

import config from '@/payload.config'

// Gate integration tests so they don't run in CI unless explicitly enabled.
// Run with RUN_INT_TESTS=1 locally to execute these.
const RUN_INT = process.env.RUN_INT_TESTS === '1' || process.env.RUN_INT_TESTS === 'true'
const suite = RUN_INT ? describe : describe.skip

let payload: Payload

suite('API', () => {
  beforeAll(async () => {
    const payloadConfig = await config
    payload = await getPayload({ config: payloadConfig })
  })

  it('fetches users', async () => {
    const users = await payload.find({
      collection: 'users',
    })
    expect(users).toBeDefined()
  })
})
