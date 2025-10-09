/**
 * Database Migration: Local Filesystem → S3 URLs
 *
 * This script updates existing PayloadCMS media records to use S3 URLs instead of local filesystem paths.
 * Run this after uploading media files to S3 to make them accessible in production.
 *
 * Usage:
 *   # Run locally (requires production .env setup):
 *   npm run migrate:media-to-s3 -- --env prod --dry-run  # Preview changes
 *   npm run migrate:media-to-s3 -- --env prod            # Apply changes
 *
 *   # Or run directly on production server:
 *   ssh user@server "cd /path/to/app && docker exec portfolio-backend-prod node scripts/migrate-media-to-s3.js --env prod --dry-run"
 */

import { getPayload, type Payload } from 'payload'

import config from '../src/payload.config.js'

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

  console.log(`\n📦 Processing ${collectionName}...`)

  try {
    // Get all documents in the collection
    const result = await payload.find({
      collection: collectionName as 'brandLogos' | 'projectScreenshots' | 'projectThumbnails',
      limit: 1000, // Adjust if you have more media files
    })

    stats.total = result.docs.length
    console.log(`   Found ${stats.total} records`)

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
          console.log(`   ⚠️ Skipping ${id}: No filename`)
          stats.skipped++
          continue
        }

        // Convert local path to S3 URL
        const cleanFilename = filename.replace(/^\/media\//, '').replace(/^\/?/, '')
        const s3Url = `${bucketUrl}/${s3Prefix}/${cleanFilename}`

        console.log(`   ${dryRun ? '[DRY RUN]' : '✏️'} ${id}: ${filename} → ${s3Url}`)

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

  if (envFlag === -1 || !args[envFlag + 1]) {
    console.error('❌ Please specify environment: --env <dev|prod>')
    process.exit(1)
  }

  const environment = args[envFlag + 1] as 'dev' | 'prod'

  if (!S3_BUCKET_URLS[environment]) {
    console.error('❌ Invalid environment. Use: dev or prod')
    process.exit(1)
  }

  // Set ENV_PROFILE to match target environment
  process.env.ENV_PROFILE = environment

  const bucketUrl = S3_BUCKET_URLS[environment]

  console.log('🔄 PayloadCMS Media Migration: Local → S3')
  console.log('==========================================')
  console.log(`Environment: ${environment.toUpperCase()}`)
  console.log(`S3 Bucket: ${bucketUrl}`)
  console.log(`Mode: ${dryRunFlag ? 'DRY RUN (preview only)' : 'LIVE MIGRATION'}`)

  if (!dryRunFlag) {
    console.log('\n⚠️  WARNING: This will modify your database!')
    console.log('   Run with --dry-run first to preview changes.')
    console.log('   Press Ctrl+C to cancel, or wait 5 seconds to continue...')
    await new Promise((resolve) => setTimeout(resolve, 5000))
  }

  let payload: Payload | null = null

  try {
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

    console.log('\n📊 Migration Summary')
    console.log('===================')
    console.log(`Total records: ${totalStats.total}`)
    console.log(`Updated: ${totalStats.updated}`)
    console.log(`Skipped: ${totalStats.skipped}`)
    console.log(`Errors: ${totalStats.errors}`)

    if (dryRunFlag) {
      console.log('\n💡 This was a dry run. Add --env prod (without --dry-run) to apply changes.')
    } else {
      console.log('\n✅ Migration complete!')
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
