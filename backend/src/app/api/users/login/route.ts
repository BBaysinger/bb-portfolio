/**
 * Login route wrapper — content-type normalization and resilience
 *
 * Why this file exists
 * - Historical context (2025-11-05): A production 500 during admin login was ultimately fixed by
 *   correcting Nginx routing so /api/users/* points to the backend (Payload), not the frontend.
 *   This route remains as a light hardening layer: it normalizes JSON, multipart/form-data,
 *   and x-www-form-urlencoded bodies and authenticates via Payload's local API, returning
 *   consistent 401/500 semantics and setting the auth cookie explicitly.
 *
 * Pros (reason to keep)
 * - Defense in depth: tolerant to client variability (e.g., HTML forms using multipart or urlencoded).
 * - Consistent responses across content-types and a single place to add logging/guardrails later.
 * - Small, low-maintenance surface area that delegates to Payload's local API.
 *
 * Cons (reason to remove)
 * - Potential drift if Payload changes the login contract; this wrapper could require updates.
 * - Duplicates capability already provided by Payload's built-in /api/users/login endpoint.
 *
 * Guidance
 * - Keep this file if any clients may submit non-JSON bodies or if you want a stable place for
 *   auth telemetry, throttling, or custom error handling.
 * - If you prefer minimalism and are confident all clients send JSON: you can remove this file and
 *   rely on Payload's built-in endpoint. Ensure Nginx continues routing /api/users/* to the backend
 *   and add an E2E check that multipart/urlencoded login attempts return 401 (not 500).
 */
import configPromise from '@payload-config'
import { getPayload } from 'payload'

export const runtime = 'nodejs'

type LoginBody = {
  email?: string
  password?: string
}

async function readCredentials(request: Request): Promise<LoginBody> {
  const contentType = request.headers.get('content-type') || ''

  try {
    if (contentType.includes('application/json')) {
      const json = (await request.json()) as Record<string, unknown>
      const pickString = (obj: Record<string, unknown>, keys: string[]): string => {
        for (const k of keys) {
          const v = obj[k]
          if (typeof v === 'string') return v
        }
        return ''
      }
      const email = pickString(json, ['email', 'username', 'identifier']).trim()
      const password = pickString(json, ['password', 'pass'])
      return { email: email || undefined, password: password || undefined }
    }

    if (
      contentType.includes('multipart/form-data') ||
      contentType.includes('application/x-www-form-urlencoded')
    ) {
      // Next.js can parse form bodies via request.formData()
      const form = await request.formData()
      // Be resilient to alternate keys sometimes used by clients
      const getFirst = (...keys: string[]) => {
        for (const k of keys) {
          const v = form.get(k)
          if (v != null) return v.toString()
        }
        // try case-insensitive scan
        const entries = Array.from(form.keys())
        for (const k of entries) {
          if (keys.some((kk) => kk.toLowerCase() === k.toLowerCase())) {
            const v = form.get(k)
            if (v != null) return v.toString()
          }
        }
        return ''
      }
      const email = getFirst('email', 'username', 'identifier').trim()
      const password = getFirst('password', 'pass')
      return { email: email || undefined, password: password || undefined }
    }
  } catch {
    // Fall through to return empty
  }

  return {}
}

export const POST = async (request: Request) => {
  const { email, password } = await readCredentials(request)

  if (!email || !password) {
    return Response.json(
      {
        error: 'Missing email or password',
        // Minimal hinting to aid debugging without leaking secrets
        received: {
          emailPresent: Boolean(email),
          passwordPresent: Boolean(password),
          contentType: request.headers.get('content-type') || undefined,
        },
      },
      { status: 400 },
    )
  }

  try {
    const payload = await getPayload({ config: configPromise })

    // Use Payload local API to authenticate
    const result = await payload.login({
      collection: 'users',
      data: { email, password },
    })

    // Set the auth cookie expected by Payload. By default this is `payload-token`.
    // Use secure cookies in production; admins access via HTTPS.
    const token =
      result && typeof (result as { token?: unknown }).token === 'string'
        ? ((result as { token?: string }).token as string)
        : undefined

    const headers = new Headers()
    if (token) {
      const isProd = process.env.ENV_PROFILE === 'prod'
      const parts = [
        `payload-token=${token}`,
        'Path=/',
        'HttpOnly',
        'SameSite=Lax',
        // 7 days
        `Max-Age=${60 * 60 * 24 * 7}`,
      ]
      if (isProd) parts.push('Secure')
      headers.append('Set-Cookie', parts.join('; '))
    }

    // Mirror Payload REST response shape succinctly
    return Response.json(
      {
        user: result.user,
      },
      { status: 200, headers },
    )
  } catch (err) {
    // Invalid credentials or internal error
    const message = err instanceof Error ? err.message : 'Login failed'
    const status = /invalid|credentials|password/i.test(message) ? 401 : 500
    return Response.json(
      { error: status === 401 ? 'Login failed' : 'Internal server error' },
      { status },
    )
  }
}
