#!/usr/bin/env node
/* ESM version of env requirement checker (renamed to .mjs for CommonJS package scope). */
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { existsSync, readFileSync } from 'node:fs'

const preNodeEnv = (process.env.NODE_ENV || '').toLowerCase()
let preProfile = (
  process.env.ENV_PROFILE || (preNodeEnv === 'production' ? 'prod' : preNodeEnv || '')
)
  .toLowerCase()
  .trim()
const shouldLoadDotenv = preProfile !== 'prod'

if (shouldLoadDotenv) {
  try {
    const dotenvMod = await import('dotenv')
    const dotenv = dotenvMod && (dotenvMod.default || dotenvMod)
    const __dirname = dirname(fileURLToPath(import.meta.url))
    const root = resolve(__dirname, '..')
    const nodeEnv = (process.env.NODE_ENV || '').toLowerCase()
    const envFiles = [
      resolve(root, '.env'),
      nodeEnv === 'production'
        ? resolve(root, '.env.production')
        : resolve(root, '.env.development'),
      resolve(root, '.env.local'),
    ]
    for (const p of envFiles) if (existsSync(p)) dotenv.config({ path: p, override: false })
  } catch (e) {
    // Fallback parser
    try {
      const __dirname = dirname(fileURLToPath(import.meta.url))
      const root = resolve(__dirname, '..')
      const nodeEnv = (process.env.NODE_ENV || '').toLowerCase()
      const envFiles = [
        resolve(root, '.env'),
        nodeEnv === 'production'
          ? resolve(root, '.env.production')
          : resolve(root, '.env.development'),
        resolve(root, '.env.local'),
      ]
      const apply = (line) => {
        const idx = line.indexOf('=')
        if (idx === -1) return
        const key = line.slice(0, idx).trim()
        const val = line
          .slice(idx + 1)
          .trim()
          .replace(/^"|^'|"$|'$/g, '')
        if (key && process.env[key] === undefined) process.env[key] = val
      }
      for (const p of envFiles) {
        if (!existsSync(p)) continue
        const content = readFileSync(p, 'utf8')
        for (const raw of content.split(/\r?\n/)) {
          const line = raw.trim()
          if (!line || line.startsWith('#')) continue
          apply(line)
        }
      }
      console.info('[backend:check-required-env] Loaded .env via fallback parser')
    } catch {
      console.warn(
        '[backend:check-required-env] Warning: dotenv not available; skipping .env preload',
      )
    }
  }
}

const { CI, GITHUB_ACTIONS, NODE_ENV, ENV_PROFILE } = process.env
const inCI = CI === 'true' || GITHUB_ACTIONS === 'true'
const lifecycle = (process.env.npm_lifecycle_event || '').toLowerCase()
const isBuildLifecycle = lifecycle.includes('build') || lifecycle === 'prebuild'
const isProdEnv = NODE_ENV === 'production' || ENV_PROFILE === 'prod'

let profile = (ENV_PROFILE || (isProdEnv ? 'prod' : NODE_ENV || '')).toLowerCase().trim()
if (!profile) {
  if (
    process.env.PROD_AWS_REGION ||
    process.env.PROD_FRONTEND_URL ||
    process.env.PROD_SES_FROM_EMAIL ||
    process.env.PROD_SES_TO_EMAIL
  ) {
    profile = 'prod'
  } else if (
    process.env.DEV_AWS_REGION ||
    process.env.DEV_FRONTEND_URL ||
    process.env.DEV_SES_FROM_EMAIL ||
    process.env.DEV_SES_TO_EMAIL
  ) {
    profile = 'dev'
  } else if (isBuildLifecycle) {
    profile = 'prod'
  } else {
    profile = 'local'
  }
}

const profileUpper = (profile || '').toUpperCase()
const pref = profileUpper ? `${profileUpper}_` : ''
const unifiedProfileKey = profileUpper ? `${profileUpper}_REQUIRED_ENVIRONMENT_VARIABLES` : ''
const unifiedGlobalKey = `REQUIRED_ENVIRONMENT_VARIABLES`
const rawList = (
  (process.env[unifiedProfileKey] || process.env[unifiedGlobalKey] || '') + ''
).trim()

const parseRequirements = (s) => {
  if (!s) return []
  return s
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((entry) =>
      entry
        .split('|')
        .map((v) => v.trim())
        .filter(Boolean),
    )
}

const requirements = parseRequirements(rawList)
const defaultCritical = [
  [`${pref}MONGODB_URI`],
  [`${pref}FRONTEND_URL`],
  [`${pref}AWS_REGION`],
  [`${pref}SES_FROM_EMAIL`, `${pref}SMTP_FROM_EMAIL`],
  [`${pref}SES_TO_EMAIL`],
  [`${pref}PAYLOAD_SECRET`],
]
const defaultLocal = [
  [`${pref}MONGODB_URI`],
  [`${pref}FRONTEND_URL`],
  [`${pref}AWS_REGION`],
  [`${pref}SES_FROM_EMAIL`, `${pref}SMTP_FROM_EMAIL`],
  [`${pref}SES_TO_EMAIL`],
  [`${pref}PAYLOAD_SECRET`],
  ['NEXT_SERVER_ACTIONS_ENCRYPTION_KEY'],
]

const hasDefinitionVar = !!(process.env[unifiedProfileKey] || process.env[unifiedGlobalKey])
if ((inCI || profile === 'prod') && !hasDefinitionVar) {
  const hint = unifiedProfileKey || '<PROFILE>_REQUIRED_ENVIRONMENT_VARIABLES'
  const msg = [
    '[backend:check-required-env] Missing definition of required env list.',
    `Profile: ${profile || '<none>'}`,
    'Please set one of:',
    `  - ${hint}`,
    '  - REQUIRED_ENVIRONMENT_VARIABLES',
    'Define a comma-separated list of groups; use "|" for ANY-of within a group.',
    'Example:',
    '  PROD_REQUIRED_ENVIRONMENT_VARIABLES=GROUP_A|GROUP_B,GROUP_C',
  ].join('\n')
  console.error(msg)
  process.exit(1)
}

const effectiveRequirements =
  requirements.length > 0
    ? requirements
    : inCI || profile === 'prod'
      ? defaultCritical
      : profile === 'local'
        ? defaultLocal
        : []

const missingGroups = []
for (const group of effectiveRequirements) {
  const satisfied = group.some((name) => !!process.env[name])
  if (!satisfied) missingGroups.push(group.join('|'))
}

if (missingGroups.length > 0) {
  const msg = [
    '[backend:check-required-env] Missing required environment variables.',
    `Profile: ${profile || '<none>'}`,
    'The following requirements were not satisfied (ANY of within each group):',
    ...missingGroups.map((g) => `  - ${g}`),
    '\nConfigure REQUIRED_ENVIRONMENT_VARIABLES or <PROFILE>_REQUIRED_ENVIRONMENT_VARIABLES.',
    'Examples:',
    '  REQUIRED_ENVIRONMENT_VARIABLES=GROUP_A|GROUP_B,GROUP_C',
    '  PROD_REQUIRED_ENVIRONMENT_VARIABLES=GROUP_A|GROUP_B,GROUP_C',
  ].join('\n')
  if (inCI || profile === 'prod') {
    console.error(msg)
    process.exit(1)
  } else {
    console.warn(msg)
  }
} else {
  const summary = effectiveRequirements.length
    ? effectiveRequirements.map((g) => `[${g.join('|')}]`).join(', ')
    : '<none> (no requirements enforced)'
  console.info(
    `[backend:check-required-env] All required envs satisfied. Profile=${profile} Requirements=${summary}\nCI=${CI} NODE_ENV=${NODE_ENV} ENV_PROFILE=${ENV_PROFILE} LIFECYCLE=${lifecycle}`,
  )
}
