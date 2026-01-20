#!/usr/bin/env tsx

/**
 * Export Complete Database Collections
 *
 * This script exports ALL collections from the local database to JSON files
 * for importing into production environments.
 */

import { writeFile, mkdir } from 'fs/promises'

import { getPayload } from 'payload'
import type { Payload } from 'payload'

const COLLECTIONS_TO_EXPORT = [
  'projects',
  'projectThumbnails',
  'projectScreenshots',
  'brandLogos',
  'brands',
] as const

async function exportCollection(
  payload: Payload,
  collectionName: (typeof COLLECTIONS_TO_EXPORT)[number],
): Promise<void> {
  console.info(`📥 Exporting ${collectionName}...`)

  try {
    const result = await payload.find({
      collection: collectionName,
      limit: 1000,
      depth: 0, // Don't populate relationships for clean export
    })

    const outputDir = 'dump/local-export'
    await mkdir(outputDir, { recursive: true })

    const outputFile = `${outputDir}/${collectionName}.json`
    const jsonData = result.docs.map((doc) => JSON.stringify(doc)).join('\n')

    await writeFile(outputFile, jsonData, 'utf-8')

    console.info(`  ✅ Exported ${result.docs.length} records to ${outputFile}`)
  } catch (error) {
    console.error(`  ❌ Failed to export ${collectionName}:`, error)
  }
}

async function main() {
  console.info('📦 Export Local Database Collections')
  console.info('===================================')

  // Use local environment (don't load from secrets)
  console.info('🔧 Using local database connection...')

  let payload: Payload | null = null

  try {
    const { default: config } = await import('../src/payload.config.js')
    payload = await getPayload({ config })

    console.info('✅ Connected to local database')

    for (const collection of COLLECTIONS_TO_EXPORT) {
      await exportCollection(payload, collection)
    }

    console.info('\n📊 Export Complete!')
    console.info('Files created in dump/local-export/')
    console.info('\nNext steps:')
    console.info('1. Review the exported files')
    console.info('2. Run import script on production to sync data')
  } catch (error) {
    console.error('❌ Error during export:', error)
  } finally {
    if (payload) {
      await payload.db?.destroy?.()
    }
  }
}

main()
