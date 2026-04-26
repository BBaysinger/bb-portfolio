const DEFAULT_TIMEOUT_MS = 8000
const DEFAULT_WARM_TIMEOUT_MS = 15000
let hasWarnedMissingSecret = false

const withNoTrailingSlash = (value: string): string => value.replace(/\/+$/, '')

const isLocalProfile = (): boolean => {
  const profile = (process.env.ENV_PROFILE || '').trim().toLowerCase()
  return profile === '' || profile === 'local'
}

const shouldSkipFrontendRevalidation = (): boolean => {
  const value = (process.env.SKIP_FRONTEND_REVALIDATE || '').trim().toLowerCase()
  return value === '1' || value === 'true' || value === 'yes'
}

const resolveEndpoint = (): string | undefined => {
  const explicit = (process.env.FRONTEND_PROJECTS_REVALIDATE_URL || '').trim()
  if (explicit) return explicit

  const publicUrl = (process.env.PUBLIC_SERVER_URL || '').trim()
  if (!publicUrl) return undefined

  return `${withNoTrailingSlash(publicUrl)}/api/revalidate/projects`
}

const resolvePublicOrigin = (): string | undefined => {
  const explicit = (process.env.FRONTEND_PROJECTS_REVALIDATE_URL || '').trim()
  if (explicit) {
    try {
      return new URL(explicit).origin
    } catch {
      // Fall through to PUBLIC_SERVER_URL.
    }
  }

  const publicUrl = (process.env.PUBLIC_SERVER_URL || '').trim()
  return publicUrl ? withNoTrailingSlash(publicUrl) : undefined
}

const normalizeWarmPaths = (paths?: string[]): string[] => {
  if (!Array.isArray(paths) || paths.length === 0) return []

  const normalized = new Set<string>()
  for (const value of paths) {
    if (typeof value !== 'string') continue
    const trimmed = value.trim()
    if (!trimmed) continue

    if (/^https?:\/\//i.test(trimmed)) {
      try {
        const url = new URL(trimmed)
        normalized.add(url.pathname || '/')
      } catch {
        // Ignore invalid explicit URLs.
      }
      continue
    }

    normalized.add(trimmed.startsWith('/') ? trimmed : `/${trimmed}`)
  }

  return Array.from(normalized)
}

// Invalidation alone leaves regeneration to the next real request.
// That is acceptable on high-traffic sites, but this portfolio can go a day with only a single
// recruiter/employer visit. Warm the key public routes immediately after a successful
// revalidation ping so the next human visitor is much more likely to receive already-regenerated
// HTML instead of paying the first-hit regeneration cost.
const warmFrontendPaths = async (paths: string[], reason: string): Promise<void> => {
  const normalizedPaths = normalizeWarmPaths(paths)
  if (normalizedPaths.length === 0) return

  const origin = resolvePublicOrigin()
  if (!origin) return

  await Promise.allSettled(
    normalizedPaths.map(async (path) => {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort('timeout'), DEFAULT_WARM_TIMEOUT_MS)

      try {
        const res = await fetch(`${origin}${path}`, {
          method: 'GET',
          headers: {
            'x-cache-warm': '1',
            'user-agent': 'payload-cms-cache-warmer/1.0',
          },
          signal: controller.signal,
        })

        if (!res.ok) {
          console.warn(
            `[revalidate] Warm request failed for ${path} after ${reason} (${res.status}).`,
          )
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        console.warn(`[revalidate] Warm request error for ${path} after ${reason}: ${message}`)
      } finally {
        clearTimeout(timeout)
      }
    }),
  )
}

type TriggerFrontendProjectRevalidateOptions = {
  warmPaths?: string[]
}

export const triggerFrontendProjectRevalidate = async (
  reason: string,
  options: TriggerFrontendProjectRevalidateOptions = {},
): Promise<void> => {
  if (shouldSkipFrontendRevalidation()) return

  const endpoint = resolveEndpoint()
  if (!endpoint) return

  const secret = (process.env.FRONTEND_PROJECTS_REVALIDATE_SECRET || '').trim()
  if (!secret) {
    if (!isLocalProfile() && !hasWarnedMissingSecret) {
      hasWarnedMissingSecret = true
      console.warn(
        '[revalidate] FRONTEND_PROJECTS_REVALIDATE_SECRET is not set; skipping revalidation ping.',
      )
    }
    return
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort('timeout'), DEFAULT_TIMEOUT_MS)

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify({ reason, source: 'payload-cms' }),
      signal: controller.signal,
    })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      console.warn(
        `[revalidate] Frontend project revalidation failed (${res.status}) at ${endpoint}${
          body ? `: ${body}` : ''
        }`,
      )
      return
    }

    await warmFrontendPaths(options.warmPaths ?? [], reason)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.warn(`[revalidate] Frontend project revalidation request error: ${message}`)
  } finally {
    clearTimeout(timeout)
  }
}
