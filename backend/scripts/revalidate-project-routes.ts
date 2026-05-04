import path from 'path'
import { fileURLToPath } from 'url'

import { getPayload, type Payload } from 'payload'

import { buildProjectsWarmPaths } from '../src/utils/frontendRouteWarmup'
import { triggerFrontendProjectRevalidate } from '../src/utils/triggerFrontendProjectRevalidate'

import { loadBackendScriptEnvironment } from './lib/payload-script-env'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

type ActiveProjectRouteTarget = {
  slug?: unknown
  shortCode?: unknown
}

const destroyPayloadWithTimeout = async (payload: Payload, label: string) => {
  const destroy = payload.db?.destroy
  if (typeof destroy !== 'function') return

  await Promise.race([
    destroy.call(payload.db),
    new Promise<void>((resolve) => {
      setTimeout(() => {
        console.warn(`Timed out while closing Payload DB after ${label}; exiting anyway.`)
        resolve()
      }, 2000)
    }),
  ])
}

const main = async () => {
  loadBackendScriptEnvironment(__dirname)

  const reasonArg = process.argv.find((arg) => arg.startsWith('--reason='))
  const reason = reasonArg?.slice('--reason='.length) || 'contentWorkflow.migrate'

  let payload: Payload | null = null

  try {
    const { default: config } = await import('../src/payload.config')
    payload = await getPayload({ config })

    const result = await payload.find({
      collection: 'projects',
      where: {
        active: { equals: true },
      },
      depth: 0,
      limit: 1000,
      overrideAccess: true,
    })

    const activeProjects = (
      Array.isArray(result.docs) ? result.docs : []
    ) as ActiveProjectRouteTarget[]

    const warmPaths = buildProjectsWarmPaths(activeProjects, { includeHome: true })
    warmPaths.push('/cv')

    await triggerFrontendProjectRevalidate(reason, {
      warmPaths: Array.from(new Set(warmPaths)),
    })

    console.info(
      `Triggered frontend project revalidation for ${activeProjects.length} active projects.`,
    )
  } finally {
    if (payload) {
      await destroyPayloadWithTimeout(payload, 'project route revalidation')
    }
  }
}

void main()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error('Failed to trigger project route revalidation:', error)
    process.exit(1)
  })
