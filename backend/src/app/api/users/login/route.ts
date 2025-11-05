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
      const json = (await request.json()) as LoginBody
      return { email: json?.email || undefined, password: json?.password || undefined }
    }

    if (
      contentType.includes('multipart/form-data') ||
      contentType.includes('application/x-www-form-urlencoded')
    ) {
      // Next.js can parse form bodies via request.formData()
      const form = await request.formData()
      const email = form.get('email')?.toString()
      const password = form.get('password')?.toString()
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
    return Response.json({ error: 'Missing email or password' }, { status: 400 })
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
