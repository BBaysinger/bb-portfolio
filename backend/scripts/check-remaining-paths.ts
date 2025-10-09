#!/usr/bin/env tsx

import { getPayload } from 'payload'

import config from '../src/payload.config.js'

async function checkRemainingPaths() {
  const payload = await getPayload({ config })

  console.log('🔍 Checking for remaining local paths...')

  // Check all collections for any remaining local paths
  const collections = ['brandLogos', 'projectScreenshots', 'projectThumbnails', 'projects'] as const

  for (const collection of collections) {
    try {
      const { docs } = await payload.find({
        collection,
        limit: 1000,
      })

      console.log(`\n📦 ${collection} (${docs.length} records):`)

      let foundIssues = false
      for (const doc of docs) {
        // Check for any field containing '/media/' or '/project-view/' paths
        const jsonStr = JSON.stringify(doc)
        if (jsonStr.includes('/media/') || jsonStr.includes('/project-view/')) {
          foundIssues = true
          console.log(`   ⚠️  ${doc.id}: Contains local paths`)

          // Show specific fields with issues
          Object.entries(doc).forEach(([key, value]) => {
            if (
              typeof value === 'string' &&
              (value.includes('/media/') || value.includes('/project-view/'))
            ) {
              console.log(`      ${key}: ${value}`)
            }
          })
        }
      }

      if (!foundIssues) {
        console.log('   ✅ No local paths found')
      }
    } catch (error) {
      console.log(
        `   ❌ Error checking ${collection}:`,
        error instanceof Error ? error.message : String(error),
      )
    }
  }

  process.exit(0)
}

checkRemainingPaths().catch((error) => {
  console.error('Error:', error)
  process.exit(1)
})
