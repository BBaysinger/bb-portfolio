import path from 'path'
import { fileURLToPath } from 'url'

import { mongooseAdapter } from '@payloadcms/db-mongodb'
import { nodemailerAdapter } from '@payloadcms/email-nodemailer'
import { payloadCloudPlugin } from '@payloadcms/payload-cloud'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { buildConfig } from 'payload'
import sharp from 'sharp'

import { BrandLogos } from './collections/BrandLogos'
import { Clients } from './collections/Brands'
import { Projects } from './collections/Projects'
import { ProjectScreenshots } from './collections/ProjectScreenshots'
import { ProjectThumbnails } from './collections/ProjectThumbnails'
import { Users } from './collections/Users'

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
    const origin = process.env[originKey]
    if (!origin) {
      throw new Error(
        `Missing required ${originKey} for ENV_PROFILE=${envProfile}. ` +
          `Set it to your frontend's public URL (e.g., http://localhost:5050 for local, https://dev.example.com for dev).`,
      )
    }
    return [origin]
  })(),
  cors: (() => {
    const originKey =
      envProfile === 'prod'
        ? 'PROD_FRONTEND_URL'
        : envProfile === 'dev'
          ? 'DEV_FRONTEND_URL'
          : 'LOCAL_FRONTEND_URL'
    const origin = process.env[originKey]
    if (!origin) {
      throw new Error(
        `Missing required ${originKey} for ENV_PROFILE=${envProfile}. ` +
          `Set it to your frontend's public URL (e.g., http://localhost:5050 for local, https://dev.example.com for dev).`,
      )
    }
    return [origin]
  })(),
  plugins: [
    payloadCloudPlugin(),
    // storage-adapter-placeholder
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
