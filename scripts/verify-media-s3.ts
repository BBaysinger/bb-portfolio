#!/usr/bin/env tsx
/**
 * Verify media files in S3 buckets
 * 
 * This script checks that media files are properly uploaded to S3 and accessible.
 * 
 * Usage:
 *   npm run media:verify -- --env dev
 *   npm run media:verify -- --env prod
 *   npm run media:verify -- --env both
 */
import { execSync } from "node:child_process";
import path from "node:path";

// Get script directory and repo root
const scriptDir = path.dirname(__filename);
const repoRoot = path.resolve(scriptDir, '..')

// S3 bucket configuration
const S3_BUCKETS = {
  dev: 'bb-portfolio-media-dev',
  prod: 'bb-portfolio-media-prod'
} as const

const MEDIA_COLLECTIONS = [
  'brand-logos',
  'project-screenshots', 
  'project-thumbnails'
] as const

type Environment = 'dev' | 'prod'

interface Options {
  environments: Environment[]
}

function parseArgs(): Options {
  const args = process.argv.slice(2)
  const options: Options = {
    environments: []
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    switch (arg) {
      case '--env':
        const env = args[++i]
        if (env === 'both') {
          options.environments = ['dev', 'prod']
        } else if (env === 'dev' || env === 'prod') {
          options.environments = [env]
        } else {
          console.error(`Invalid environment: ${env}. Use 'dev', 'prod', or 'both'`)
          process.exit(1)
        }
        break
      case '--help':
      case '-h':
        console.log(`
Usage: npm run media:verify -- [options]

Options:
  --env <env>     Environment to verify: dev, prod, or both
  --help, -h      Show this help message

Examples:
  npm run media:verify -- --env dev
  npm run media:verify -- --env both
        `)
        process.exit(0)
    }
  }

  if (options.environments.length === 0) {
    console.error('Please specify an environment with --env <dev|prod|both>')
    console.log('Use --help for more information')
    process.exit(1)
  }

  return options
}

function verifyCollection(collection: string, environment: Environment): { count: number; success: boolean } {
  const bucket = S3_BUCKETS[environment]
  const s3Path = `s3://${bucket}/${collection}/`

  try {
    const result = execSync(
      `aws s3 ls "${s3Path}" --recursive | grep -E "\\.(svg|webp|png|jpg|jpeg)$" | wc -l`,
      { cwd: repoRoot, encoding: 'utf8' }
    )
    const count = parseInt(result.trim())
    return { count, success: true }
  } catch (error) {
    console.error(`Error verifying ${collection} in ${environment}:`, error)
    return { count: 0, success: false }
  }
}

function testSampleUrls(environment: Environment) {
  const bucket = S3_BUCKETS[environment]
  
  // Test a few sample URLs to see if they're accessible
  const sampleFiles = [
    'brand-logos/bbi.svg',
    'project-thumbnails/bikini-bottom-phone.webp'
  ]

  console.log(`\nTesting sample URLs for ${environment}...`)
  
  for (const file of sampleFiles) {
    const url = `https://${bucket}.s3.amazonaws.com/${file}`
    try {
      execSync(`curl -I "${url}" 2>/dev/null | head -1`, { 
        stdio: 'pipe',
        encoding: 'utf8' 
      })
      console.log(`  ✅ ${file}`)
    } catch {
      console.log(`  ❌ ${file} - Not accessible`)
    }
  }
}

function main() {
  const options = parseArgs()

  console.log('🔍 Portfolio Media Verification')
  console.log('==============================')

  // Check AWS CLI
  try {
    execSync('aws --version', { stdio: 'ignore' })
  } catch {
    console.error('AWS CLI not found. Please install and configure it.')
    process.exit(1)
  }

  for (const env of options.environments) {
    console.log(`\n📦 Verifying ${env.toUpperCase()} environment...`)
    
    let totalFiles = 0
    let hasErrors = false

    for (const collection of MEDIA_COLLECTIONS) {
      const result = verifyCollection(collection, env)
      console.log(`  ${collection}: ${result.count} files`)
      
      if (!result.success) {
        hasErrors = true
      }
      totalFiles += result.count
    }

    console.log(`  Total: ${totalFiles} files`)

    if (totalFiles === 0) {
      console.log(`  ⚠️  No files found in ${env} bucket. Run media upload first.`)
      hasErrors = true
    }

    if (!hasErrors) {
      testSampleUrls(env)
    }
  }

  console.log('\n✅ Verification complete!')
}

// Run main function if this script is executed directly
if (require.main === module) {
  main()
}