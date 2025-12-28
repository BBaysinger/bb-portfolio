#!/usr/bin/env tsx
/*
  Backend prebuild guard for required env vars (TypeScript version).

  Features:
  - Loads .env files with Next.js/Payload-like precedence before validation:
    1) .env
    2) .env.[development|production] (based on NODE_ENV)
    3) .env.local (overrides)
  - REQUIRED_ENVIRONMENT_VARIABLES_BACKEND: comma-separated list; supports ANY-of groups with "|".
  - Default safety (CI+prod only): require critical backend vars if no explicit list was given.
*/

import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const TAG = '[backend:check-required-env]'
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const rootDir = resolve(__dirname, '..')

type RequirementGroup = string[]

type RequirementList = RequirementGroup[]

async function loadDotEnvFiles(paths: string[]): Promise<void> {
  try {
    const dotenvMod = await import('dotenv')
    const dotenv = (dotenvMod.default || dotenvMod) as {
      config: (options: { path: string; override: boolean }) => void
    }

    for (const filePath of paths) {
      if (existsSync(filePath)) {
        dotenv.config({ path: filePath, override: false })
      }
    }
    return
  } catch {
    // Fall back to a lightweight parser if dotenv is unavailable
    try {
      for (const filePath of paths) {
        if (!existsSync(filePath)) continue
        const content = readFileSync(filePath, 'utf8')
        for (const rawLine of content.split(/\r?\n/)) {
          const line = rawLine.trim()
          if (!line || line.startsWith('#')) continue
          const idx = line.indexOf('=')
          if (idx === -1) continue
          const key = line.slice(0, idx).trim()
          if (!key) continue
          const rawValue = line.slice(idx + 1).trim()
          const value = rawValue.replace(/^"|^'|"$|'$/g, '')
          if (process.env[key] === undefined) {
            process.env[key] = value
          }
        }
      }
      console.info(`${TAG} Loaded .env via fallback parser`)
    } catch {
      console.warn(`${TAG} Warning: dotenv not available; skipping .env preload`)
    }
  }
}

function parseRequirements(list: string | undefined): RequirementList {
  if (!list) return []
  return list
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((entry) =>
      entry
        .split('|')
        .map((value) => value.trim())
        .filter(Boolean),
    )
}

function summarizeRequirements(groups: RequirementList): string {
  if (!groups.length) return '<none> (no requirements enforced)'
  return groups.map((group) => `[${group.join('|')}]`).join(', ')
}

async function main() {
  const preNodeEnv = (process.env.NODE_ENV || '').toLowerCase()
  let preProfile = (
    process.env.ENV_PROFILE || (preNodeEnv === 'production' ? 'prod' : preNodeEnv || '')
  )
    .toLowerCase()
    .trim()
  const shouldLoadDotenv = preProfile !== 'prod'

  if (shouldLoadDotenv) {
    const envFiles = [
      resolve(rootDir, '.env'),
      preNodeEnv === 'production'
        ? resolve(rootDir, '.env.production')
        : resolve(rootDir, '.env.development'),
      resolve(rootDir, '.env.local'),
    ]
    await loadDotEnvFiles(envFiles)
  }

  const { CI, GITHUB_ACTIONS, NODE_ENV, ENV_PROFILE } = process.env

  const inCI = CI === 'true' || GITHUB_ACTIONS === 'true'
  const lifecycle = (process.env.npm_lifecycle_event || '').toLowerCase()
  const isBuildLifecycle = lifecycle.includes('build') || lifecycle === 'prebuild'
  const isProdEnv = NODE_ENV === 'production' || ENV_PROFILE === 'prod'

  let profile = (ENV_PROFILE || (isProdEnv ? 'prod' : NODE_ENV || '')).toLowerCase().trim()
  if (!profile) {
    profile = isBuildLifecycle ? 'prod' : 'local'
  }

  const rawListBackend = `${process.env.REQUIRED_ENVIRONMENT_VARIABLES_BACKEND || ''}`.trim()
  const requirements = parseRequirements(rawListBackend)

  const defaultCritical: RequirementList = [
    ['MONGODB_URI'],
    ['FRONTEND_URL'],
    ['AWS_REGION'],
    ['SES_FROM_EMAIL', 'SMTP_FROM_EMAIL'],
    ['SES_TO_EMAIL'],
    ['PAYLOAD_SECRET'],
  ]

  const defaultLocal: RequirementList = [...defaultCritical, ['NEXT_SERVER_ACTIONS_ENCRYPTION_KEY']]

  const hasDefinitionVar = rawListBackend.length > 0
  if ((inCI || profile === 'prod') && !hasDefinitionVar) {
    const msg = [
      `${TAG} Missing definition of required env list.`,
      `Profile: ${profile || '<none>'}`,
      'Please set REQUIRED_ENVIRONMENT_VARIABLES_BACKEND.',
      'Define a comma-separated list of groups; use "|" for ANY-of within a group.',
      'Example:',
      '  REQUIRED_ENVIRONMENT_VARIABLES_BACKEND=GROUP_A|GROUP_B,GROUP_C',
    ].join('\n')
    console.error(msg)
    process.exit(1)
  }

  const effectiveRequirements: RequirementList | [] = requirements.length
    ? requirements
    : inCI || profile === 'prod'
      ? defaultCritical
      : profile === 'local'
        ? defaultLocal
        : []

  const missingGroups: string[] = []
  for (const group of effectiveRequirements) {
    const satisfied = group.some((name) => !!process.env[name])
    if (!satisfied) missingGroups.push(group.join('|'))
  }

  if (missingGroups.length > 0) {
    const msg = [
      `${TAG} Missing required environment variables.`,
      `Profile: ${profile || '<none>'}`,
      'Definition source: REQUIRED_ENVIRONMENT_VARIABLES_BACKEND',
      'The following requirements were not satisfied (ANY of within each group):',
      ...missingGroups.map((group) => `  - ${group}`),
      '',
      'Configure REQUIRED_ENVIRONMENT_VARIABLES_BACKEND for your build.',
    ].join('\n')

    if (inCI || profile === 'prod') {
      console.error(msg)
      process.exit(1)
    } else {
      console.warn(msg)
    }
  } else {
    const summary = summarizeRequirements(effectiveRequirements)
    console.info(
      `${TAG} All required envs satisfied. Profile=${profile} Source=REQUIRED_ENVIRONMENT_VARIABLES_BACKEND Requirements=${summary}\nCI=${CI} NODE_ENV=${NODE_ENV} ENV_PROFILE=${ENV_PROFILE} LIFECYCLE=${lifecycle}`,
    )
  }
}

main().catch((error) => {
  console.error(`${TAG} Unexpected failure`, error)
  process.exit(1)
})
