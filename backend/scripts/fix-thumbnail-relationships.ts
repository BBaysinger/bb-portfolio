#!/usr/bin/env tsx

import { getPayload } from 'payload'

import config from '../src/payload.config.js'

async function fixProjectThumbnailRelationships() {
  const payload = await getPayload({ config })

  console.log('🔧 Fixing project thumbnail relationships...')

  // Get all projects
  const { docs: projects } = await payload.find({
    collection: 'projects',
    limit: 1000,
  })

  // Get all project thumbnails
  const { docs: thumbnails } = await payload.find({
    collection: 'projectThumbnails',
    limit: 1000,
  })

  console.log(`Found ${projects.length} projects and ${thumbnails.length} thumbnails`)

  // Create a mapping of common name patterns
  const nameMap: Record<string, string> = {
    'bikini-bottom-buddy-search': 'bikini-bottom',
    'ultimate-trivia': 'trivia',
    'expiration-date': 'tomato',
    'mobile-share-planner': 'share',
    'data-calculator': 'calc', // Need to check if this exists
    'usda-pushgraph': 'pushgraph',
    'seven2-experience-spokane': 's2es',
    'merit-and-preferred-choice': 'premera',
    'what-is-second-step-landing': 'portfolio',
    'ultimate-alliance-3': 'ua3',
    'bowsers-inside-story': 'bowser',
    'super-mario-party': 'marioparty',
    'bystolic-email': 'bystolic',
    'golden-1-credit-union': 'golden1',
    'exact-sciences-website': 'exas',
    'slideshow-component': 'slideshow',
    'portfolio-website': 'portfolio',
    'mix-n-match-dress-up': 'mix-match',
  }

  let updated = 0
  let skipped = 0

  for (const project of projects) {
    const expectedThumbnailName = nameMap[project.slug]

    if (!expectedThumbnailName) {
      console.log(`⚠️  No mapping found for project: ${project.slug}`)
      skipped++
      continue
    }

    // Find matching thumbnail
    const matchingThumbnail = thumbnails.find(
      (thumb) =>
        thumb.filename?.includes(expectedThumbnailName) ||
        thumb.url?.includes(expectedThumbnailName),
    )

    if (matchingThumbnail) {
      console.log(`✅ ${project.title} → ${matchingThumbnail.filename}`)

      // Update the project with the thumbnail relationship
      await payload.update({
        collection: 'projects',
        id: project.id,
        data: {
          thumbnail: [matchingThumbnail.id],
        },
      })
      updated++
    } else {
      console.log(
        `❌ No thumbnail found for ${project.slug} (looking for: ${expectedThumbnailName})`,
      )
      skipped++
    }
  }

  console.log(`\n📊 Summary: ${updated} updated, ${skipped} skipped`)

  process.exit(0)
}

fixProjectThumbnailRelationships().catch((error) => {
  console.error('Error:', error)
  process.exit(1)
})
