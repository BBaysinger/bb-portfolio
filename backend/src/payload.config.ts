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
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: mongooseAdapter({
    url: process.env.MONGODB_URI || '',
  }),
  sharp,
  // Security settings
  upload: {
    limits: {
      fileSize: 5000000, // 5MB limit
    },
  },
  csrf: [
    // Allow requests from your frontend domain
    process.env.FRONTEND_URL || 'http://localhost:3000',
    process.env.FRONTEND_URL_PROD || 'https://yourdomain.com',
  ],
  cors: [
    // Allow CORS from your frontend domain
    process.env.FRONTEND_URL || 'http://localhost:3000',
    process.env.FRONTEND_URL_PROD || 'https://yourdomain.com',
  ],
  plugins: [
    payloadCloudPlugin(),
    // storage-adapter-placeholder
  ],
  email:
    envProfile === 'prod' || envProfile === 'dev'
      ? nodemailerAdapter({
          defaultFromAddress: 'noreply@yoursite.com',
          defaultFromName: 'Your Portfolio',
          transport: {
            host: process.env.SMTP_HOST,
            port: 587,
            auth: {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS,
            },
          },
        })
      : undefined,
})
