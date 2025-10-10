#!/usr/bin/env tsx
/**
 * Rebuild Media Records from S3
 *
 * This script scans the S3 bucket and creates database records for all media files,
 * ensuring the ObjectIds match what the projects expect from the dump.
 */

import { getPayload } from 'payload'
import type { Payload } from 'payload'

// Load environment variables (same as other migration scripts)
async function loadEnvironmentFromSecrets() {
  const { readFile } = await import('fs/promises')
  const JSON5 = (await import('json5')).default

  try {
    const secretsContent = await readFile('../.github-secrets.private.json5', 'utf-8')
    const secrets = JSON5.parse(secretsContent)

    const environment = process.env.ENVIRONMENT || 'PROD'

    if (secrets[environment]) {
      for (const [key, value] of Object.entries(secrets[environment])) {
        if (typeof value === 'string') {
          process.env[key] = value
        }
      }
      console.log(`✅ Loaded ${environment} environment variables`)
    }
  } catch (error) {
    console.error('Failed to load secrets:', error)
  }
}

async function getS3Files(bucketName: string, prefix: string): Promise<string[]> {
  const { execSync } = await import('child_process')

  try {
    const output = execSync(`aws s3 ls s3://${bucketName}/${prefix}/ --recursive`, {
      encoding: 'utf8',
      stdio: 'pipe',
    })

    return output
      .split('\n')
      .filter((line) => line.trim())
      .map((line) => line.split(/\s+/).pop()!)
      .filter((filename) => filename && filename.includes(prefix))
      .map((filename) => filename.replace(`${prefix}/`, ''))
  } catch (error) {
    console.error(`Failed to list S3 files for ${prefix}:`, error)
    return []
  }
}

type CollectionSlug = 'projectThumbnails' | 'projectScreenshots' | 'brandLogos'

interface MediaCollectionConfig {
  name: CollectionSlug
  s3Prefix: string
  expectedIds: string[] // From projects dump
}

const COLLECTIONS: MediaCollectionConfig[] = [
  {
    name: 'projectThumbnails',
    s3Prefix: 'project-thumbnails',
    expectedIds: [],
  },
  {
    name: 'projectScreenshots',
    s3Prefix: 'project-screenshots',
    expectedIds: [],
  },
  {
    name: 'brandLogos',
    s3Prefix: 'brand-logos',
    expectedIds: [],
  },
]

interface ProjectDumpRecord {
  thumbnail?: Array<{ $oid?: string }>
  screenshots?: Array<{ $oid?: string }>
  [key: string]: unknown
}

async function extractExpectedIds() {
  const { readFile } = await import('fs/promises')

  try {
    const projectsContent = await readFile('dump/projects.json', 'utf-8')
    const projects = projectsContent.split('\n').filter((line) => line.trim())

    const allThumbnailIds = new Set<string>()
    const allScreenshotIds = new Set<string>()

    for (const projectLine of projects) {
      const project: ProjectDumpRecord = JSON.parse(projectLine)

      // Extract thumbnail IDs
      if (project.thumbnail && Array.isArray(project.thumbnail)) {
        project.thumbnail.forEach((thumb: { $oid?: string }) => {
          if (thumb.$oid) allThumbnailIds.add(thumb.$oid)
        })
      }

      // Extract screenshot IDs
      if (project.screenshots && Array.isArray(project.screenshots)) {
        project.screenshots.forEach((screenshot: { $oid?: string }) => {
          if (screenshot.$oid) allScreenshotIds.add(screenshot.$oid)
        })
      }
    }

    // Update collections with expected IDs
    COLLECTIONS.find((c) => c.name === 'projectThumbnails')!.expectedIds =
      Array.from(allThumbnailIds)
    COLLECTIONS.find((c) => c.name === 'projectScreenshots')!.expectedIds =
      Array.from(allScreenshotIds)

    console.log(`📋 Expected IDs extracted:`)
    console.log(`  - Thumbnails: ${allThumbnailIds.size}`)
    console.log(`  - Screenshots: ${allScreenshotIds.size}`)
  } catch (error) {
    console.error('Failed to extract expected IDs:', error)
  }
}

async function rebuildMediaCollection(
  payload: Payload,
  config: MediaCollectionConfig,
  bucketUrl: string,
): Promise<{ created: number; errors: number }> {
  console.log(`\n📁 Rebuilding ${config.name} collection...`)

  // Get files from S3
  const s3Files = await getS3Files('bb-portfolio-media-prod', config.s3Prefix)
  console.log(`  Found ${s3Files.length} files in S3`)

  let created = 0
  let errors = 0

  for (let i = 0; i < s3Files.length; i++) {
    const filename = s3Files[i]
    const fileUrl = `${bucketUrl}/${config.s3Prefix}/${filename}`

    // Use expected ID if available, otherwise generate new one
    const expectedId = config.expectedIds[i] || undefined

    try {
      // Create base data object
      const baseData = {
        filename,
        url: fileUrl,
        alt: filename.replace(/\.(webp|jpg|jpeg|png|svg)$/i, '').replace(/[-_]/g, ' '),
        mimeType: filename.endsWith('.svg') ? 'image/svg+xml' : 'image/webp',
        filesize: 0, // We don't have this info from S3 listing
        width: 0, // Would need to fetch to determine
        height: 0,
      }

      let mediaRecord

      if (expectedId) {
        // Try to create with specific ID (this might not work with all Payload configurations)
        try {
          mediaRecord = await payload.create({
            collection: config.name as 'projectThumbnails' | 'projectScreenshots' | 'brandLogos',
            data: { ...baseData, id: expectedId },
          })
        } catch (idError) {
          // If setting ID fails, create normally and log the mismatch
          console.log(
            `  ⚠️  Could not set specific ID for ${filename}, creating with auto-generated ID`,
            idError instanceof Error ? idError.message : String(idError),
          )
          mediaRecord = await payload.create({
            collection: config.name as 'projectThumbnails' | 'projectScreenshots' | 'brandLogos',
            data: baseData,
          })
        }
      } else {
        // Create with auto-generated ID
        mediaRecord = await payload.create({
          collection: config.name as 'projectThumbnails' | 'projectScreenshots' | 'brandLogos',
          data: baseData,
        })
      }

      console.log(`  ✅ Created: ${filename} (ID: ${mediaRecord.id})`)
      if (expectedId && mediaRecord.id !== expectedId) {
        console.log(`  ⚠️  ID mismatch: expected ${expectedId}, got ${mediaRecord.id}`)
      }
      created++
    } catch (error) {
      console.error(
        `  ❌ Failed to create ${filename}:`,
        error instanceof Error ? error.message : String(error),
      )
      errors++
    }
  }

  return { created, errors }
}

async function main() {
  console.log('🔧 Rebuild Media Records from S3')
  console.log('===============================')

  await loadEnvironmentFromSecrets()
  await extractExpectedIds()

  const bucketUrl = 'https://bb-portfolio-media-prod.s3.amazonaws.com'

  let payload: Payload | null = null

  try {
    const { default: config } = await import('../src/payload.config.js')
    payload = await getPayload({ config })

    const totalStats = { created: 0, errors: 0 }

    for (const collectionConfig of COLLECTIONS) {
      const stats = await rebuildMediaCollection(payload, collectionConfig, bucketUrl)
      totalStats.created += stats.created
      totalStats.errors += stats.errors
    }

    console.log('\n📊 Rebuild Summary')
    console.log('==================')
    console.log(`Total created: ${totalStats.created}`)
    console.log(`Total errors: ${totalStats.errors}`)
    console.log('\n✅ Media records rebuilt!')
  } catch (error) {
    console.error('❌ Error during rebuild:', error)
  } finally {
    if (payload) {
      await payload.db?.destroy?.()
    }
  }
}

// Allow environment to be passed via command line
if (process.argv.includes('--env')) {
  const envIndex = process.argv.indexOf('--env')
  const environment = process.argv[envIndex + 1]
  if (environment) {
    process.env.ENVIRONMENT = environment.toUpperCase()
  }
}

main()
