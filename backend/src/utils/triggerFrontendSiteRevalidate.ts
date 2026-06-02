const DEFAULT_TIMEOUT_MS = 8000
const DEFAULT_WARM_TIMEOUT_MS = 15000
let hasWarnedMissingSecret = false

const withNoTrailingSlash = (value: string): string => value.replace(/\/+$/, '')

const getOrigins = (raw: string): string[] => {
  return raw
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
    .map(withNoTrailingSlash)
}

const isLocalProfile = (): boolean => {
  const profile = (process.env.ENV_PROFILE || '').trim().toLowerCase()
  return profile === '' || profile === 'local'
}

const shouldSkipFrontendRevalidation = (): boolean => {
  const value = (process.env.SKIP_FRONTEND_REVALIDATE || '').trim().toLowerCase()
  return value === '1' || value === 'true' || value === 'yes'
}

const resolveEndpoints = (): string[] => {
  const explicitSite = (process.env.FRONTEND_SITE_REVALIDATE_URL || '').trim()
  if (explicitSite) return [explicitSite]

  const explicitProjects = (process.env.FRONTEND_PROJECTS_REVALIDATE_URL || '').trim()
  if (explicitProjects) {
    try {
      const url = new URL(explicitProjects)
      url.pathname = '/api/revalidate/site'
      url.search = ''
      url.hash = ''
      return [url.toString()]
    } catch {
      // Fall through to origin-derived endpoints.
    }
  }

  const frontendUrls = getOrigins(process.env.FRONTEND_URL || '')
  if (frontendUrls.length > 0) {
    return frontendUrls.map((frontendUrl) => `${frontendUrl}/api/revalidate/site`)
  }

  const publicUrl = (process.env.PUBLIC_SERVER_URL || '').trim()
  if (!publicUrl) return []

  return [`${withNoTrailingSlash(publicUrl)}/api/revalidate/site`]
}

const resolvePublicOrigins = (): string[] => {
  const explicit =
    (process.env.FRONTEND_SITE_REVALIDATE_URL || '').trim() ||
    (process.env.FRONTEND_PROJECTS_REVALIDATE_URL || '').trim()
  if (explicit) {
    try {
      return [new URL(explicit).origin]
    } catch {
      // Fall through to PUBLIC_SERVER_URL.
    }
  }

  const frontendUrls = getOrigins(process.env.FRONTEND_URL || '')
  if (frontendUrls.length > 0) return frontendUrls

  const publicUrl = (process.env.PUBLIC_SERVER_URL || '').trim()
  return publicUrl ? [withNoTrailingSlash(publicUrl)] : []
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

const originForEndpoint = (endpoint: string): string | undefined => {
  try {
    return new URL(endpoint).origin
  } catch {
    return undefined
  }
}

const warmFrontendPaths = async (
  paths: string[],
  reason: string,
  originOverride?: string,
): Promise<void> => {
  const normalizedPaths = normalizeWarmPaths(paths)
  if (normalizedPaths.length === 0) return

  const origin = originOverride ?? resolvePublicOrigins()[0]
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

type TriggerFrontendSiteRevalidateOptions = {
  warmPaths?: string[]
}

export const triggerFrontendSiteRevalidate = async (
  reason: string,
  options: TriggerFrontendSiteRevalidateOptions = {},
): Promise<void> => {
  if (shouldSkipFrontendRevalidation()) return

  const endpoints = resolveEndpoints()
  if (endpoints.length === 0) return

  const secret =
    (process.env.FRONTEND_SITE_REVALIDATE_SECRET || '').trim() ||
    (process.env.FRONTEND_PROJECTS_REVALIDATE_SECRET || '').trim()
  const isLocal = isLocalProfile()

  if (!secret && !isLocal) {
    if (!isLocalProfile() && !hasWarnedMissingSecret) {
      hasWarnedMissingSecret = true
      console.warn(
        '[revalidate] FRONTEND_SITE_REVALIDATE_SECRET and FRONTEND_PROJECTS_REVALIDATE_SECRET are not set; skipping site revalidation ping.',
      )
    }
    return
  }

  const failures: string[] = []

  for (const endpoint of endpoints) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort('timeout'), DEFAULT_TIMEOUT_MS)

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(secret ? { authorization: `Bearer ${secret}` } : {}),
        },
        body: JSON.stringify({ reason, source: 'payload-cms' }),
        signal: controller.signal,
      })

      if (!res.ok) {
        const body = await res.text().catch(() => '')
        failures.push(`${endpoint} (${res.status}${body ? `: ${body}` : ''})`)
        continue
      }

      await warmFrontendPaths(options.warmPaths ?? [], reason, originForEndpoint(endpoint))
      return
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      failures.push(`${endpoint} (${message})`)
    } finally {
      clearTimeout(timeout)
    }
  }

  if (failures.length > 0) {
    console.warn(
      `[revalidate] Frontend site revalidation failed for all configured endpoints: ${failures.join('; ')}`,
    )
  }
}
