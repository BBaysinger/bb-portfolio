const DEFAULT_TIMEOUT_MS = 8000
let hasWarnedMissingSecret = false

const withNoTrailingSlash = (value: string): string => value.replace(/\/+$/, '')

const isLocalProfile = (): boolean => {
  const profile = (process.env.ENV_PROFILE || '').trim().toLowerCase()
  return profile === '' || profile === 'local'
}

const resolveEndpoint = (): string | undefined => {
  const explicit = (process.env.FRONTEND_PROJECTS_REVALIDATE_URL || '').trim()
  if (explicit) return explicit

  const publicUrl = (process.env.PUBLIC_SERVER_URL || '').trim()
  if (!publicUrl) return undefined

  return `${withNoTrailingSlash(publicUrl)}/api/revalidate/projects`
}

export const triggerFrontendProjectRevalidate = async (reason: string): Promise<void> => {
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
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.warn(`[revalidate] Frontend project revalidation request error: ${message}`)
  } finally {
    clearTimeout(timeout)
  }
}
