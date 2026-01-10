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
  identifier?: string
  password?: string
}

async function readCredentials(request: Request): Promise<LoginBody> {
  const contentType = request.headers.get('content-type') || ''
  const tried = { json: false, form: false }

  const pickString = (obj: Record<string, unknown>, keys: string[]): string => {
    for (const k of keys) {
      const v = obj[k]
      if (typeof v === 'string') return v
    }
    // case-insensitive scan for near matches (e.g., Email, USERNAME)
    const lowerMap: Record<string, string> = {}
    for (const [k, v] of Object.entries(obj)) {
      if (typeof v === 'string') lowerMap[k.toLowerCase()] = v
    }
    for (const k of keys) {
      const v = lowerMap[k.toLowerCase()]
      if (typeof v === 'string') return v
    }
    return ''
  }

  const pickFromForm = async (req: Request): Promise<LoginBody> => {
    try {
      const form = await req.formData()
      const keys = Array.from(form.keys())
      const findVal = (candidates: string[]): string => {
        // exact
        for (const k of candidates) {
          const v = form.get(k)
          if (v != null) return v.toString()
        }
        // case-insensitive
        for (const name of keys) {
          if (candidates.some((k) => k.toLowerCase() === name.toLowerCase())) {
            const v = form.get(name)
            if (v != null) return v.toString()
          }
        }
        // fuzzy: substring like user[email]
        for (const name of keys) {
          if (candidates.some((k) => name.toLowerCase().includes(k.toLowerCase()))) {
            const v = form.get(name)
            if (v != null) return v.toString()
          }
        }
        return ''
      }
      const identifier = findVal(['email', 'username', 'identifier']).trim()
      const password = findVal(['password', 'pass'])
      if (identifier || password)
        return { identifier: identifier || undefined, password: password || undefined }

      // New: Some clients send a single JSON blob field (e.g., _payload, payload, data)
      // Try to parse any string field that looks like JSON and extract the same keys.
      const jsonLikeKeys = ['_payload', 'payload', 'data', 'body']
      for (const name of keys) {
        const v = form.get(name)
        if (v != null) {
          const s = v.toString().trim()
          if (s.startsWith('{') || s.startsWith('[') || jsonLikeKeys.includes(name)) {
            try {
              const obj = JSON.parse(s) as Record<string, unknown>
              const nestedEmail = pickString(obj, ['email', 'username', 'identifier']).trim()
              const nestedPass = pickString(obj, ['password', 'pass'])
              if (nestedEmail || nestedPass) {
                return { identifier: nestedEmail || undefined, password: nestedPass || undefined }
              }
              // Try common nested containers
              for (const container of ['data', 'user', 'payload']) {
                const inner = obj?.[container]
                if (inner && typeof inner === 'object') {
                  const ne = pickString(inner as Record<string, unknown>, [
                    'email',
                    'username',
                    'identifier',
                  ]).trim()
                  const np = pickString(inner as Record<string, unknown>, ['password', 'pass'])
                  if (ne || np) return { identifier: ne || undefined, password: np || undefined }
                }
              }
            } catch {
              // not JSON; continue
            }
          }
        }
      }

      return { email: undefined, password: undefined }
    } catch {
      return {}
    }
  }

  // First pass based on content-type
  try {
    if (contentType.includes('application/json')) {
      tried.json = true
      const json = (await request.clone().json()) as Record<string, unknown>
      const identifier = pickString(json, ['email', 'username', 'identifier']).trim()
      const password = pickString(json, ['password', 'pass'])
      if (identifier || password)
        return { identifier: identifier || undefined, password: password || undefined }
    }
    if (
      contentType.includes('multipart/form-data') ||
      contentType.includes('application/x-www-form-urlencoded')
    ) {
      tried.form = true
      const fromForm = await pickFromForm(request.clone())
      if (fromForm.identifier || fromForm.password) return fromForm
    }
  } catch {
    // ignore and try fallbacks
  }

  // Fallbacks: try the other parsers if not tried, then text sniffing
  if (!tried.form) {
    const fromForm = await pickFromForm(request.clone())
    if (fromForm.identifier || fromForm.password) return fromForm
  }
  if (!tried.json) {
    try {
      const json = (await request.clone().json()) as Record<string, unknown>
      const identifier = pickString(json, ['email', 'username', 'identifier']).trim()
      const password = pickString(json, ['password', 'pass'])
      if (identifier || password)
        return { identifier: identifier || undefined, password: password || undefined }
    } catch {
      // ignore
    }
  }
  try {
    const txt = await request.clone().text()
    if (txt) {
      // Try JSON text
      try {
        const json = JSON.parse(txt) as Record<string, unknown>
        const identifier = pickString(json, ['email', 'username', 'identifier']).trim()
        const password = pickString(json, ['password', 'pass'])
        if (identifier || password)
          return { identifier: identifier || undefined, password: password || undefined }
      } catch {
        // Try urlencoded
        const params = new URLSearchParams(txt)
        const getParam = (names: string[]) => {
          for (const n of names) {
            const v = params.get(n)
            if (v) return v
          }
          // fuzzy
          for (const [k, v] of params.entries()) {
            if (names.some((n) => k.toLowerCase().includes(n.toLowerCase()))) return v
          }
          return ''
        }
        const identifier = getParam(['email', 'username', 'identifier']).trim()
        const password = getParam(['password', 'pass'])
        if (identifier || password)
          return { identifier: identifier || undefined, password: password || undefined }
      }
    }
  } catch {
    // ignore
  }

  return {}
}

export const POST = async (request: Request) => {
  const { identifier, password } = await readCredentials(request)

  if (!identifier || !password) {
    // Provide safe diagnostics (no secrets) to help identify parsing mismatches in prod
    let jsonKeys: string[] | undefined
    let formKeys: string[] | undefined
    try {
      const txt = await request.clone().text()
      try {
        const parsed = JSON.parse(txt)
        jsonKeys =
          parsed && typeof parsed === 'object'
            ? Object.keys(parsed as Record<string, unknown>).slice(0, 10)
            : undefined
      } catch {
        // Not JSON; attempt to list form keys without values
        const form = await request.clone().formData()
        formKeys = Array.from(form.keys()).slice(0, 10)
      }
    } catch {
      // ignore
    }

    return Response.json(
      {
        error: 'Missing identifier or password',
        received: {
          identifierPresent: Boolean(identifier),
          passwordPresent: Boolean(password),
          contentType: request.headers.get('content-type') || undefined,
          jsonKeys,
          formKeys,
        },
      },
      { status: 400 },
    )
  }

  try {
    const payload = await getPayload({ config: configPromise })

    // Payload's built-in local auth strategy logs in by email+password.
    // If the client provides a username, resolve it to an email first.
    const looksLikeEmail = /^\S+@\S+\.[A-Za-z]{2,}$/.test(identifier)
    let email = identifier
    if (!looksLikeEmail) {
      try {
        const users = await payload.find({
          collection: 'users',
          where: {
            username: {
              equals: identifier,
            },
          },
          limit: 1,
          overrideAccess: true,
        })

        const user = users?.docs?.[0]
        if (user && typeof (user as { email?: unknown }).email === 'string') {
          email = (user as { email: string }).email
        } else {
          return Response.json({ error: 'Login failed' }, { status: 401 })
        }
      } catch {
        return Response.json({ error: 'Login failed' }, { status: 401 })
      }
    }

    // Use Payload local API to authenticate
    const result = await payload.login({
      collection: 'users',
      data: { email, password },
    })

    // Best-effort audit log (do not block login on failures)
    try {
      type LoginResult = {
        user?: {
          id?: unknown
        }
        token?: unknown
      }

      const forwarded = request.headers.get('x-forwarded-for')
      const ip = forwarded
        ? forwarded.split(',')[0]?.trim()
        : request.headers.get('x-real-ip') || undefined
      const userAgent = request.headers.get('user-agent') || undefined

      const loginResult = result as unknown as LoginResult
      const userId =
        typeof loginResult.user?.id === 'string' && loginResult.user.id.length > 0
          ? loginResult.user.id
          : undefined

      if (typeof userId === 'string' && userId.length > 0) {
        await payload.create({
          collection: 'authEvents',
          data: {
            eventType: 'login',
            method: 'password',
            user: userId,
            ip,
            userAgent,
          },
          overrideAccess: true,
        })
      }
    } catch {
      // ignore
    }

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
