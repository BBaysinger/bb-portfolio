import path from 'path'
import { fileURLToPath } from 'url'

import { mongooseAdapter } from '@payloadcms/db-mongodb'
import { nodemailerAdapter } from '@payloadcms/email-nodemailer'
import { payloadCloudPlugin } from '@payloadcms/payload-cloud'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { s3Storage } from '@payloadcms/storage-s3'
import { buildConfig } from 'payload'
import sharp from 'sharp'

import { BrandLogos } from './collections/BrandLogos'
import { Clients } from './collections/Brands'
import { Projects } from './collections/Projects'
import { ProjectScreenshots } from './collections/ProjectScreenshots'
import { ProjectThumbnails } from './collections/ProjectThumbnails'
import { Users } from './collections/Users'
import type { Config } from './payload-types'

// ===============================================================
// ENVIRONMENT FILES (.env.dev, .env.prod)
// ===============================================================
// These files are NOT sourced from the repo during deployment.
// They are dynamically generated on EC2 by the CI/CD workflow,
// with contents exclusively pulled from GitHub Actions secrets and variables.
// Local development uses .env only.
// ===============================================================

const envProfile = process.env.ENV_PROFILE || 'local'
// Resolve MongoDB URI strictly from ENV_PROFILE-prefixed variables
const mongoEnvKey =
  envProfile === 'prod'
    ? 'PROD_MONGODB_URI'
    : envProfile === 'dev'
      ? 'DEV_MONGODB_URI'
      : 'LOCAL_MONGODB_URI'
const mongoURL = process.env[mongoEnvKey]
if (!mongoURL) {
  // Enforce prefix-first convention with no unprefixed fallback
  // Surfaces clear guidance for where to set the value
  throw new Error(
    `Missing required ${mongoEnvKey} for ENV_PROFILE=${envProfile}. ` +
      `Set it in the appropriate backend .env file (e.g., backend/.env for local, or generated .env.<profile> on your host), ` +
      `or define it in your deployment secrets.`,
  )
}
const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Users, Projects, Clients, BrandLogos, ProjectScreenshots, ProjectThumbnails],
  editor: lexicalEditor(),
  // Enforce prefixed payload secret by environment profile
  secret: (() => {
    const key =
      envProfile === 'prod'
        ? 'PROD_PAYLOAD_SECRET'
        : envProfile === 'dev'
          ? 'DEV_PAYLOAD_SECRET'
          : 'LOCAL_PAYLOAD_SECRET'
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
      fileSize: 5000000, // 5MB limit
    },
  },
  csrf: (() => {
    const originKey =
      envProfile === 'prod'
        ? 'PROD_FRONTEND_URL'
        : envProfile === 'dev'
          ? 'DEV_FRONTEND_URL'
          : 'LOCAL_FRONTEND_URL'
    const raw = process.env[originKey]
    if (!raw) {
      throw new Error(
        `Missing required ${originKey} for ENV_PROFILE=${envProfile}. ` +
          `Set it to your frontend's public URL (e.g., http://localhost:5050 or http://localhost:3000 for local, https://dev.example.com for dev).`,
      )
    }
    // Support comma-separated list of allowed origins (e.g., "http://localhost:5050,http://localhost:3000")
    const origins = raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    return origins
  })(),
  cors: (() => {
    const originKey =
      envProfile === 'prod'
        ? 'PROD_FRONTEND_URL'
        : envProfile === 'dev'
          ? 'DEV_FRONTEND_URL'
          : 'LOCAL_FRONTEND_URL'
    const raw = process.env[originKey]
    if (!raw) {
      throw new Error(
        `Missing required ${originKey} for ENV_PROFILE=${envProfile}. ` +
          `Set it to your frontend's public URL (e.g., http://localhost:5050 or http://localhost:3000 for local, https://dev.example.com for dev).`,
      )
    }
    const origins = raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    return origins
  })(),
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
              const key = envProfile === 'prod' ? 'PROD_S3_BUCKET' : 'DEV_S3_BUCKET'
              const val = process.env[key]
              if (!val) throw new Error(`Missing required ${key} for ENV_PROFILE=${envProfile}`)
              return val
            })(),
            config: {
              region: (() => {
                const key = envProfile === 'prod' ? 'PROD_AWS_REGION' : 'DEV_AWS_REGION'
                const val = process.env[key]
                if (!val) throw new Error(`Missing required ${key} for ENV_PROFILE=${envProfile}`)
                return val
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
            // Optionally set a CDN base URL in a future update if supported by the package version
          }),
        ]
      : []),
  ],
  email: (() => {
    if (envProfile === 'prod' || envProfile === 'dev') {
      const prefix = envProfile === 'prod' ? 'PROD_' : 'DEV_'
      const host = process.env[`${prefix}SMTP_HOST`]
      const user = process.env[`${prefix}SMTP_USER`]
      const pass = process.env[`${prefix}SMTP_PASS`]
      if (host && user && pass) {
        return nodemailerAdapter({
          defaultFromAddress: 'noreply@yoursite.com',
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
})
