/**
 * Database Migration: Local Filesystem → S3 URLs
 *
 * This script updates existing PayloadCMS media records to use S3 URLs instead of local filesystem paths.
 * Run this after uploading media files to S3 to make them accessible in production.
 *
 * Usage:
 *   # Run locally (env is required; script prefers process.env and can load from .env files):
 *   # 1) Using backend/.env.<env> auto-detection
 *   tsx scripts/migrate-media-to-s3.ts --env dev --dry-run
 *   tsx scripts/migrate-media-to-s3.ts --env prod --dry-run
 *   # 2) Explicit --env-file
 *   tsx scripts/migrate-media-to-s3.ts --env prod --env-file ./backend/.env.prod --dry-run
 *   # 3) With env exported in your shell
 *   ENV_PROFILE=prod PROD_MONGODB_URI=... PROD_PAYLOAD_SECRET=... tsx scripts/migrate-media-to-s3.ts --env prod --dry-run
 *
 *   # Apply changes (remove --dry-run)
 *   tsx scripts/migrate-media-to-s3.ts --env dev
 *   tsx scripts/migrate-media-to-s3.ts --env prod
 *
 *   # Or run directly on production server (recommended for prod):
 *   ssh user@server "cd /path/to/app && docker exec bb-portfolio-backend-prod node scripts/migrate-media-to-s3.js --env prod --dry-run"
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

import { getPayload, type Payload } from 'payload'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * Minimal .env loader: KEY=VALUE pairs, ignores comments and blanks.
 * Only sets process.env[KEY] if it's not already set.
 */
function loadDotEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return
  const content = fs.readFileSync(filePath, 'utf-8')
  content.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) return
    const eq = trimmed.indexOf('=')
    if (eq === -1) return
    const key = trimmed.slice(0, eq).trim()
    let val = trimmed.slice(eq + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = val
  })
}

/**
 * Ensure required environment variables are present.
 * Prefers existing process.env. Optionally loads backend/.env.<env> or --env-file path.
 * S3 static credentials remain OPTIONAL (AWS default chain or instance roles may be used).
 */
function ensureEnvironment(environment: 'dev' | 'prod', opts?: { envFile?: string }) {
  process.env.ENV_PROFILE = environment

  const envPrefix = environment.toUpperCase()
  const requiredVars = [
    `${envPrefix}_MONGODB_URI`,
    `${envPrefix}_PAYLOAD_SECRET`,
    `${envPrefix}_FRONTEND_URL`,
    `${envPrefix}_S3_BUCKET`,
    `${envPrefix}_AWS_REGION`,
  ] as const

  const hasAll = () => requiredVars.every((k) => process.env[k] && process.env[k]!.length > 0)

  if (!hasAll()) {
    // Try an explicit env file if provided
    if (opts?.envFile) loadDotEnvFile(opts.envFile)
  }

  if (!hasAll()) {
    // Try backend/.env.<env> next to this script
    const candidate = path.resolve(__dirname, `../.env.${environment}`)
    loadDotEnvFile(candidate)
  }

  if (!hasAll()) {
    const missing = requiredVars.filter((k) => !process.env[k])
    throw new Error(
      `Missing required environment variables for ${environment}: ${missing.join(', ')}.\n` +
        `Provide them via your shell, an --env-file, or backend/.env.${environment}.`,
    )
  }
}

interface MediaDocument {
  id: string
  filename?: string
  url?: string
}

interface MigrationStats {
  total: number
  updated: number
  skipped: number
  errors: number
}

const S3_BUCKET_URLS = {
  dev: 'https://bb-portfolio-media-dev.s3.us-west-2.amazonaws.com',
  prod: 'https://bb-portfolio-media-prod.s3.us-west-2.amazonaws.com',
}

const MEDIA_COLLECTIONS = [
  { name: 'brandLogos', prefix: 'brand-logos' },
  { name: 'projectScreenshots', prefix: 'project-screenshots' },
  { name: 'projectThumbnails', prefix: 'project-thumbnails' },
]

async function migrateMediaCollection(
  payload: Payload,
  collectionName: string,
  s3Prefix: string,
  bucketUrl: string,
  dryRun: boolean = false,
): Promise<{ total: number; updated: number; skipped: number; errors: number }> {
  const stats: MigrationStats = { total: 0, updated: 0, skipped: 0, errors: 0 }

  console.info(`\n📦 Processing ${collectionName}...`)

  try {
    // Get all documents in the collection
    const result = await payload.find({
      collection: collectionName as 'brandLogos' | 'projectScreenshots' | 'projectThumbnails',
      limit: 1000, // Adjust if you have more media files
    })

    stats.total = result.docs.length
    console.info(`   Found ${stats.total} records`)

    for (const doc of result.docs) {
      try {
        const { id, filename, url } = doc as MediaDocument

        // Skip if already has S3 URL
        if (url && url.includes('s3.amazonaws.com')) {
          stats.skipped++
          continue
        }

        // Skip if no filename
        if (!filename) {
          console.info(`   ⚠️ Skipping ${id}: No filename`)
          stats.skipped++
          continue
        }

        // Convert local path to S3 URL
        const cleanFilename = filename.replace(/^\/media\//, '').replace(/^\/?/, '')
        const s3Url = `${bucketUrl}/${s3Prefix}/${cleanFilename}`

        console.info(`   ${dryRun ? '[DRY RUN]' : '✏️'} ${id}: ${filename} → ${s3Url}`)

        if (!dryRun) {
          // Use direct Mongoose update to bypass PayloadCMS validation
          const Model = payload.db.collections[collectionName]
          await Model.findByIdAndUpdate(id, {
            url: s3Url,
            filename: cleanFilename,
          })
        }

        stats.updated++
      } catch (error) {
        console.error(
          `   ❌ Error updating ${doc.id}:`,
          error instanceof Error ? error.message : String(error),
        )
        stats.errors++
      }
    }
  } catch (error) {
    console.error(
      `❌ Error processing ${collectionName}:`,
      error instanceof Error ? error.message : String(error),
    )
    stats.errors = stats.total
  }

  return stats
}

async function main() {
  const args = process.argv.slice(2)
  const envFlag = args.indexOf('--env')
  const dryRunFlag = args.includes('--dry-run')
  const envFileFlag = args.indexOf('--env-file')

  if (envFlag === -1 || !args[envFlag + 1]) {
    console.error('❌ Please specify environment: --env <dev|prod>')
    process.exit(1)
  }

  const environment = args[envFlag + 1] as 'dev' | 'prod'

  if (!S3_BUCKET_URLS[environment]) {
    console.error('❌ Invalid environment. Use: dev or prod')
    process.exit(1)
  }

  // Ensure environment variables (prefer process.env; optional .env file)
  try {
    const envFile = envFileFlag !== -1 ? args[envFileFlag + 1] : undefined
    ensureEnvironment(environment, { envFile })
  } catch (error) {
    console.error(
      '❌ Failed to load environment:',
      error instanceof Error ? error.message : String(error),
    )
    process.exit(1)
  }

  const bucketUrl = S3_BUCKET_URLS[environment]

  console.info('🔄 PayloadCMS Media Migration: Local → S3')
  console.info('==========================================')
  console.info(`Environment: ${environment.toUpperCase()}`)
  console.info(`S3 Bucket: ${bucketUrl}`)
  console.info(`Mode: ${dryRunFlag ? 'DRY RUN (preview only)' : 'LIVE MIGRATION'}`)

  if (!dryRunFlag) {
    console.info('\n⚠️  WARNING: This will modify your database!')
    console.info('   Run with --dry-run first to preview changes.')
    console.info('   Press Ctrl+C to cancel, or wait 5 seconds to continue...')
    await new Promise((resolve) => setTimeout(resolve, 5000))
  }

  let payload: Payload | null = null

  try {
    // Dynamically import payload config after environment is set
    const { default: config } = await import('../src/payload.config.js')

    // Initialize Payload
    payload = await getPayload({ config })

    const totalStats: MigrationStats = { total: 0, updated: 0, skipped: 0, errors: 0 }

    // Migrate each media collection
    for (const { name, prefix } of MEDIA_COLLECTIONS) {
      const stats = await migrateMediaCollection(payload, name, prefix, bucketUrl, dryRunFlag)

      totalStats.total += stats.total
      totalStats.updated += stats.updated
      totalStats.skipped += stats.skipped
      totalStats.errors += stats.errors
    }

    console.info('\n📊 Migration Summary')
    console.info('===================')
    console.info(`Total records: ${totalStats.total}`)
    console.info(`Updated: ${totalStats.updated}`)
    console.info(`Skipped: ${totalStats.skipped}`)
    console.info(`Errors: ${totalStats.errors}`)

    if (dryRunFlag) {
      console.info(
        `\n💡 This was a dry run. Remove --dry-run to apply changes to ${environment} media bucket.`,
      )
    } else {
      console.info('\n✅ Migration complete!')
    }
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  } finally {
    // Close database connection to allow script to exit
    if (payload && payload.db && typeof payload.db.destroy === 'function') {
      try {
        await payload.db.destroy()
      } catch {
        // Ignore cleanup errors
      }
    }
    process.exit(0)
  }
}

// Run main function if this is the main module
main().catch(console.error)
