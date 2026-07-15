// Shared implementation for the frontend cache-revalidation triggers.
//
// Payload hooks (CV, projects/branding/greeting, site) all need to POST to a
// Next.js revalidate route and then optionally warm a few public paths. The only
// per-target differences are the route path, a human label for log messages, and
// the env var names used to resolve an explicit URL / secret. Everything else:
// endpoint resolution, trailing-slash normalization, internal-URL preference,
// warm requests, and failure logging lives here once.

const DEFAULT_TIMEOUT_MS = 8000
const DEFAULT_WARM_TIMEOUT_MS = 15000
const DEFAULT_SCHEDULE_DELAY_MS = 2000
const DEFAULT_WARM_CONCURRENCY = 2

// Shared fallbacks used by every target when a target-specific value is absent.
const PROJECTS_URL_ENV = 'FRONTEND_PROJECTS_REVALIDATE_URL'
const PROJECTS_SECRET_ENV = 'FRONTEND_PROJECTS_REVALIDATE_SECRET'

export type FrontendRevalidateTarget = {
  /** Human label used in log messages, e.g. "CV", "project", "site". */
  label: string
  /** Revalidate route path, e.g. "/api/revalidate/cv". */
  path: string
  /** Env var holding an explicit revalidate URL for this target (optional). */
  explicitUrlEnv?: string
  /** Env var holding the shared secret for this target. */
  secretEnv: string
}

export type TriggerFrontendRevalidateOptions = {
  warmPaths?: string[]
}

export type TriggerFrontendRevalidate = (
  reason: string,
  options?: TriggerFrontendRevalidateOptions,
) => Promise<void>

export type ScheduleFrontendRevalidate = (
  reason: string,
  options?: TriggerFrontendRevalidateOptions,
) => Promise<void>

const readEnv = (name?: string): string => (name ? (process.env[name] || '').trim() : '')

const withNoTrailingSlash = (value: string): string => value.replace(/\/+$/, '')

// The frontend runs with `trailingSlash: true`, so POSTing to a slash-less
// revalidate path triggers a 308 redirect. Normalize to the trailing-slash form
// so the authenticated POST hits the route handler directly.
const ensureTrailingSlash = (value: string): string => {
  try {
    const url = new URL(value)
    if (!url.pathname.endsWith('/')) url.pathname = `${url.pathname}/`
    return url.toString()
  } catch {
    return value.endsWith('/') ? value : `${value}/`
  }
}

// Optional internal container URL (e.g. http://bb-portfolio-frontend-prod:3000)
// used to reach the frontend directly, avoiding public-domain hairpin routing.
const resolveInternalBase = (): string => withNoTrailingSlash(readEnv('FRONTEND_INTERNAL_URL'))

const getOrigins = (raw: string): string[] =>
  raw
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
    .map(withNoTrailingSlash)

const isLocalProfile = (): boolean => {
  const profile = (process.env.ENV_PROFILE || '').trim().toLowerCase()
  return profile === '' || profile === 'local'
}

const shouldSkipFrontendRevalidation = (): boolean => {
  const value = (process.env.SKIP_FRONTEND_REVALIDATE || '').trim().toLowerCase()
  return value === '1' || value === 'true' || value === 'yes'
}

const rewritePathname = (rawUrl: string, path: string): string | undefined => {
  try {
    const url = new URL(rawUrl)
    url.pathname = path
    url.search = ''
    url.hash = ''
    return url.toString()
  } catch {
    return undefined
  }
}

const resolvePublicEndpoints = (target: FrontendRevalidateTarget): string[] => {
  const explicit = readEnv(target.explicitUrlEnv)
  if (explicit) return [explicit]

  const explicitProjects = readEnv(PROJECTS_URL_ENV)
  if (explicitProjects) {
    const rewritten = rewritePathname(explicitProjects, target.path)
    if (rewritten) return [rewritten]
  }

  const frontendUrls = getOrigins(process.env.FRONTEND_URL || '')
  if (frontendUrls.length > 0) {
    return frontendUrls.map((frontendUrl) => `${frontendUrl}${target.path}`)
  }

  const publicUrl = readEnv('PUBLIC_SERVER_URL')
  if (!publicUrl) return []

  return [`${withNoTrailingSlash(publicUrl)}${target.path}`]
}

const resolveEndpoints = (target: FrontendRevalidateTarget): string[] => {
  const internalBase = resolveInternalBase()
  const internal = internalBase ? [`${internalBase}${target.path}`] : []
  return [...internal, ...resolvePublicEndpoints(target)].map(ensureTrailingSlash)
}

// Invalidation alone leaves regeneration to the next real request. That is fine on
// high-traffic sites, but this portfolio can go a day with only a single
// recruiter/employer visit. Warming the key public routes immediately after a
// successful revalidation ping makes it much more likely the next human visitor
// receives already-regenerated HTML instead of paying the first-hit cost.
const resolvePublicOrigins = (target: FrontendRevalidateTarget): string[] => {
  const explicit = readEnv(target.explicitUrlEnv) || readEnv(PROJECTS_URL_ENV)
  if (explicit) {
    try {
      return [new URL(explicit).origin]
    } catch {
      // Fall through to PUBLIC_SERVER_URL.
    }
  }

  const frontendUrls = getOrigins(process.env.FRONTEND_URL || '')
  if (frontendUrls.length > 0) return frontendUrls

  const publicUrl = readEnv('PUBLIC_SERVER_URL')
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
  target: FrontendRevalidateTarget,
  paths: string[],
  reason: string,
  originOverride?: string,
): Promise<void> => {
  const normalizedPaths = normalizeWarmPaths(paths)
  if (normalizedPaths.length === 0) return

  const origin = originOverride ?? resolvePublicOrigins(target)[0]
  if (!origin) return

  const warmPath = async (path: string): Promise<void> => {
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
  }

  // A bulk database migration can invalidate dozens of generated routes at
  // once. Warming all of them concurrently creates an ISR thundering herd and
  // can make every request time out on the small dev deployment. Keep a small
  // bounded pool so regeneration progresses without overwhelming Next.js or
  // the backend.
  for (let index = 0; index < normalizedPaths.length; index += DEFAULT_WARM_CONCURRENCY) {
    const batch = normalizedPaths.slice(index, index + DEFAULT_WARM_CONCURRENCY)
    await Promise.allSettled(batch.map(warmPath))
  }
}

const resolveSecret = (target: FrontendRevalidateTarget): string =>
  readEnv(target.secretEnv) || readEnv(PROJECTS_SECRET_ENV)

const missingSecretEnvNames = (target: FrontendRevalidateTarget): string[] =>
  Array.from(new Set([target.secretEnv, PROJECTS_SECRET_ENV]))

// Per-target guard so a missing secret is only warned about once per process,
// without one target's warning suppressing another's.
const warnedMissingSecret = new Set<string>()

/**
 * Build a revalidation trigger for a specific frontend target. The returned
 * function POSTs to the target's revalidate route (preferring the internal
 * container URL, then public URLs), then warms any provided paths.
 */
export const createFrontendRevalidateTrigger = (
  target: FrontendRevalidateTarget,
): TriggerFrontendRevalidate => {
  return async (reason, options = {}) => {
    if (shouldSkipFrontendRevalidation()) return

    const endpoints = resolveEndpoints(target)
    if (endpoints.length === 0) {
      if (isLocalProfile()) return
      throw new Error(
        `[revalidate] No frontend ${target.label} revalidation endpoint is configured.`,
      )
    }

    const secret = resolveSecret(target)
    if (!secret && !isLocalProfile()) {
      if (!warnedMissingSecret.has(target.label)) {
        warnedMissingSecret.add(target.label)
        const names = missingSecretEnvNames(target)
        const verb = names.length > 1 ? 'are' : 'is'
        console.warn(
          `[revalidate] ${names.join(' and ')} ${verb} not set; skipping ${target.label} revalidation ping.`,
        )
      }
      throw new Error(
        `[revalidate] ${missingSecretEnvNames(target).join(' or ')} must be configured for ${target.label} revalidation.`,
      )
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

        await warmFrontendPaths(
          target,
          options.warmPaths ?? [],
          reason,
          originForEndpoint(endpoint),
        )
        return
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        failures.push(`${endpoint} (${message})`)
      } finally {
        clearTimeout(timeout)
      }
    }

    if (failures.length > 0) {
      throw new Error(
        `[revalidate] Frontend ${target.label} revalidation failed for all configured endpoints: ${failures.join('; ')}`,
      )
    }
  }
}

export const createScheduledFrontendRevalidateTrigger = (
  trigger: TriggerFrontendRevalidate,
  delayMs = DEFAULT_SCHEDULE_DELAY_MS,
): ScheduleFrontendRevalidate => {
  let timer: ReturnType<typeof setTimeout> | undefined
  const reasons = new Set<string>()
  const warmPaths = new Set<string>()
  const waiters: Array<{ resolve: () => void; reject: (error: unknown) => void }> = []

  return (reason, options = {}) => {
    reasons.add(reason)
    for (const path of options.warmPaths ?? []) {
      warmPaths.add(path)
    }

    if (timer) {
      clearTimeout(timer)
    }

    const completion = new Promise<void>((resolve, reject) => {
      waiters.push({ resolve, reject })
    })

    timer = setTimeout(async () => {
      timer = undefined
      const scheduledReasons = Array.from(reasons)
      const scheduledWarmPaths = Array.from(warmPaths)
      const scheduledWaiters = waiters.splice(0)
      reasons.clear()
      warmPaths.clear()

      try {
        await trigger(scheduledReasons.join(', '), { warmPaths: scheduledWarmPaths })
        for (const waiter of scheduledWaiters) waiter.resolve()
      } catch (error) {
        for (const waiter of scheduledWaiters) waiter.reject(error)
      }
    }, delayMs)

    return completion
  }
}
