import { createRequire } from 'module'
import path from 'path'
import { fileURLToPath } from 'url'

import { mongooseAdapter } from '@payloadcms/db-mongodb'
import { nodemailerAdapter } from '@payloadcms/email-nodemailer'
import { payloadCloudPlugin } from '@payloadcms/payload-cloud'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { s3Storage } from '@payloadcms/storage-s3'
import { buildConfig } from 'payload'

import { AuthEvents } from './collections/AuthEvents'
import { BrandLogos } from './collections/BrandLogos'
import { Clients } from './collections/Brands'
import { Projects } from './collections/Projects'
import { ProjectScreenshots } from './collections/ProjectScreenshots'
import { ProjectThumbnails } from './collections/ProjectThumbnails'
import { Users } from './collections/Users'
import { ContactInfo } from './globals/ContactInfo'
import type { Config } from './payload-types'

// ===============================================================
// ENVIRONMENT FILES (.env.dev, .env.prod)
// ===============================================================
// These files are NOT sourced from the repo during deployment.
// They are dynamically generated on EC2 by the CI/CD workflow,
// with contents exclusively pulled from GitHub Actions secrets and variables.
// Local development uses .env only.
// ===============================================================

const envProfile = (process.env.ENV_PROFILE || 'local').toLowerCase()
const isProd = envProfile === 'prod'
const isDev = envProfile === 'dev'

const disableSharp = (() => {
  const raw = (process.env.PAYLOAD_DISABLE_SHARP || process.env.DISABLE_SHARP || '').toLowerCase()
  return raw === '1' || raw === 'true' || raw === 'yes'
})()

const sharp = (() => {
  if (disableSharp) return undefined
  try {
    const require = createRequire(import.meta.url)
    return require('sharp') as unknown as typeof import('sharp')
  } catch (err) {
    // Fail fast with a clearer message. This is typically a local dev dependency issue.
    throw new Error(
      [
        'Failed to load `sharp` (required for Payload image processing).',
        'If you are running a maintenance script that does not require uploads, set PAYLOAD_DISABLE_SHARP=true.',
        'Otherwise, fix your local sharp/libvips install or run in the Docker container.',
        String(err),
      ].join('\n'),
    )
  }
})()

type ResolveOptions = {
  description?: string
}

const optionalEnv = (key: string) => process.env[key]

const requireEnv = (key: string, options?: ResolveOptions): string => {
  const value = process.env[key]
  if (value) return value

  const lines = [`Missing required ${key} for ENV_PROFILE=${envProfile}.`]
  if (options?.description) lines.push(options.description)
  throw new Error(lines.join('\n'))
}

const mongoURL = requireEnv('MONGODB_URI', {
  description:
    'Add it to backend/.env for local dev or to the generated .env.<profile> file on your host.',
})
const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

type PayloadWithExpress = {
  express?: import('express').Express
}

const resolvedServerURL =
  process.env.PAYLOAD_PUBLIC_SERVER_URL ||
  requireEnv('PUBLIC_SERVER_URL', {
    description: [
      'This should be the origin (scheme + host + optional port) serving /admin and /api.',
      'Examples:',
      '  http://localhost:3001  # bare-metal backend dev',
      '  http://localhost:8081  # docker backend port-forward',
      '  http://localhost:8080  # local Caddy proxy',
      '  https://example.com   # production',
    ].join('\n'),
  })

// Parse comma-separated origin allowlists used by Payload's CORS/CSRF guards.
// We keep this intentionally strict: these should be full origins (scheme + host + optional port),
// not patterns or paths (e.g., "https://bbaysinger.io", "http://localhost:3000").
const parseOriginList = (raw: string): string[] => {
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((origin) => origin.replace(/\/$/, ''))
}

// Build the list of browser origins allowed to make state-changing requests.
//
// Why both FRONTEND_URL and serverURL?
// - FRONTEND_URL is the conventional source of truth for the public site origin(s).
// - serverURL is the canonical origin for Payload admin + API.
//
// In practice these are often the same, but during domain/HTTPS migrations it's easy for
// FRONTEND_URL to drift (old domain, missing www, http vs https). Allowing the serverURL
// origin avoids "You are not allowed to perform this action" errors in the admin UI
// while still remaining an explicit allowlist (no wildcards).
const getAllowedBrowserOrigins = (): string[] => {
  const origins = new Set<string>()

  const frontendRaw = requireEnv('FRONTEND_URL', {
    description:
      'Provide the public frontend origin(s). Comma-separate multiple values (e.g., http://localhost:8080,http://localhost:3000).',
  })

  for (const origin of parseOriginList(frontendRaw)) origins.add(origin)

  try {
    origins.add(new URL(resolvedServerURL).origin)
  } catch {
    // resolvedServerURL is already validated as required, but keep this defensive.
  }

  return Array.from(origins)
}

const allowedBrowserOrigins = getAllowedBrowserOrigins()

export default buildConfig({
  // Explicit public origin ensures Payload admin/API use the canonical host
  serverURL: resolvedServerURL,
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
      importMapFile: path.resolve(dirname, 'app/(payload)/importMap.js'),
      autoGenerate: false,
    },
  },
  // Conventional pattern WITHOUT Next basePath: explicitly mount admin UI at /admin and API at /api.
  // Public uploads will resolve from /media (Payload default) and no custom base prefixes are applied.
  routes: {
    admin: '/admin',
    api: '/api',
  },
  collections: [
    Users,
    AuthEvents,
    Projects,
    Clients,
    BrandLogos,
    ProjectScreenshots,
    ProjectThumbnails,
  ],
  globals: [ContactInfo],
  editor: lexicalEditor(),
  // Enforce prefixed payload secret by environment profile
  secret: (() => {
    const key = 'PAYLOAD_SECRET'
    const val = process.env[key]
    if (!val) {
      throw new Error(
        `Missing required ${key} for ENV_PROFILE=${envProfile}. ` +
          `Add it to the appropriate backend .env file or your deployment secrets.`,
      )
    }
    return val
  })(),
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: mongooseAdapter({
    url: mongoURL,
  }),
  sharp,
  // Security settings
  upload: {
    limits: {
      fileSize: 2000000, // 2MB limit
    },
  },
  csrf: allowedBrowserOrigins,
  cors: allowedBrowserOrigins,
  plugins: [
    payloadCloudPlugin(),
    // Enable S3 storage when running in dev/prod; keep filesystem in local
    ...(envProfile === 'dev' || envProfile === 'prod'
      ? [
          s3Storage({
            collections: {
              brandLogos: { prefix: 'brand-logos' },
              projectScreenshots: { prefix: 'project-screenshots' },
              projectThumbnails: { prefix: 'project-thumbnails' },
            } as Partial<Record<keyof Config['collections'], { prefix: string } | true>>,
            bucket: (() => {
              return requireEnv('S3_BUCKET', {
                description: 'Define the S3 bucket name used for Payload media uploads.',
              })
            })(),
            config: {
              region: (() => {
                const region = optionalEnv('AWS_REGION') || process.env.S3_REGION
                if (!region) {
                  throw new Error(
                    `Missing required AWS_REGION or S3_REGION for ENV_PROFILE=${envProfile}`,
                  )
                }
                return region
              })(),
              // Credentials are optional on EC2 when using instance role
              ...(process.env.S3_AWS_ACCESS_KEY_ID && process.env.S3_AWS_SECRET_ACCESS_KEY
                ? {
                    credentials: {
                      accessKeyId: process.env.S3_AWS_ACCESS_KEY_ID,
                      secretAccessKey: process.env.S3_AWS_SECRET_ACCESS_KEY,
                    },
                  }
                : {}),
            },
          }),
        ]
      : []),
  ],
  email: (() => {
    if (isProd || isDev) {
      const host = optionalEnv('SMTP_HOST')
      const user = optionalEnv('SMTP_USER')
      const pass = optionalEnv('SMTP_PASS')
      if (host && user && pass) {
        const fromEmail = optionalEnv('SMTP_FROM_EMAIL') || optionalEnv('SES_FROM_EMAIL')
        if (!fromEmail) {
          throw new Error(
            `Missing required SMTP_FROM_EMAIL or SES_FROM_EMAIL for ENV_PROFILE=${envProfile}. ` +
              `Set it to the email address you want to send emails from.`,
          )
        }
        return nodemailerAdapter({
          defaultFromAddress: fromEmail,
          defaultFromName: 'Your Portfolio',
          transport: {
            host,
            port: 587,
            auth: { user, pass },
          },
        })
      }
    }
    return undefined
  })(),
  onInit: async (payload) => {
    const expressApp = (payload as typeof payload & PayloadWithExpress).express
    expressApp?.set('trust proxy', true)
  },
})
