#!/usr/bin/env node
/*
  Backend prebuild guard for required env vars (ESM-compatible JS).

  Features:
  - Loads .env files with Next.js/Payload-like precedence before validation:
    1) .env
    2) .env.[development|production] (based on NODE_ENV)
    3) .env.local (overrides)
  - REQUIRED_ENVIRONMENT_VARIABLES: comma-separated list; supports ANY-of groups with "|".
  - <PROFILE>_REQUIRED_ENVIRONMENT_VARIABLES: per-environment override (e.g., PROD_REQUIRED_ENVIRONMENT_VARIABLES).
  - Default safety (CI+prod only): require critical backend vars if no explicit list was given.
*/
;(async function () {
  // Decide whether to load .env files BEFORE loading them to avoid prod picking up local defaults.
  const preNodeEnv = (process.env.NODE_ENV || '').toLowerCase()
  let preProfile = (
    process.env.ENV_PROFILE || (preNodeEnv === 'production' ? 'prod' : preNodeEnv || '')
  )
    .toLowerCase()
    .trim()
  const shouldLoadDotenv = preProfile !== 'prod'

  if (shouldLoadDotenv) {
    // Load .env files with precedence similar to Next.js, but do not override explicit env
    try {
      const { dirname, resolve } = await import('node:path')
      const { fileURLToPath } = await import('node:url')
      const { existsSync } = await import('node:fs')
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

      for (const p of envFiles) {
        if (existsSync(p)) dotenv.config({ path: p, override: false })
      }
    } catch (_) {
      // Best-effort fallback loader (no external deps required)
      try {
        const { dirname, resolve } = await import('node:path')
        const { fileURLToPath } = await import('node:url')
        const { existsSync, readFileSync } = await import('node:fs')
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
          if (!key) return
          if (process.env[key] === undefined) {
            process.env[key] = val
          }
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
      } catch (__) {
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

  // Derive effective profile
  let profile = (ENV_PROFILE || (isProdEnv ? 'prod' : NODE_ENV || '')).toLowerCase().trim()
  if (!profile) {
    profile = isBuildLifecycle ? 'prod' : 'local'
  }

  const rawList = ((process.env.REQUIRED_ENVIRONMENT_VARIABLES || '') + '').trim()

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

  // Defaults when no explicit list provided
  const defaultCritical = [
    ['MONGODB_URI'],
    ['FRONTEND_URL'],
    ['AWS_REGION'],
    ['SES_FROM_EMAIL', 'SMTP_FROM_EMAIL'],
    ['SES_TO_EMAIL'],
    ['PAYLOAD_SECRET'],
  ]
  const defaultLocal = [
    ['MONGODB_URI'],
    ['FRONTEND_URL'],
    ['AWS_REGION'],
    ['SES_FROM_EMAIL', 'SMTP_FROM_EMAIL'],
    ['SES_TO_EMAIL'],
    ['PAYLOAD_SECRET'],
    // Useful in local to ensure Server Actions crypto key is set
    ['NEXT_SERVER_ACTIONS_ENCRYPTION_KEY'],
  ]

  // Require presence of explicit definition variable in CI/build/prod
  const hasDefinitionVar = !!rawList
  // Only enforce strictly in CI or prod profile; allow non-CI local builds to proceed
  if ((inCI || profile === 'prod') && !hasDefinitionVar) {
    const msg = [
      '[backend:check-required-env] Missing definition of required env list.',
      `Profile: ${profile || '<none>'}`,
      'Please set one of:',
      '  - REQUIRED_ENVIRONMENT_VARIABLES',
      'Define a comma-separated list of groups; use "|" for ANY-of within a group.',
      'Example:',
      '  REQUIRED_ENVIRONMENT_VARIABLES=GROUP_A|GROUP_B,GROUP_C',
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
      '\nConfigure REQUIRED_ENVIRONMENT_VARIABLES for your build.',
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
})()
