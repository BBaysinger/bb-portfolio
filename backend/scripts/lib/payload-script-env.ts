import fs from 'fs'
import path from 'path'

import dotenv from 'dotenv'
import JSON5 from 'json5'

type SecretBundle = {
  strings: Record<string, string>
  files: Record<string, string>
}

const normalizeSecrets = (data: unknown): SecretBundle => {
  if (!data || typeof data !== 'object') return { strings: {}, files: {} }

  const maybe = data as { strings?: unknown; files?: unknown }
  if (maybe.strings || maybe.files) {
    const out: SecretBundle = { strings: {}, files: {} }
    const strings = maybe.strings as Record<string, unknown> | undefined
    const files = maybe.files as Record<string, unknown> | undefined

    if (strings) {
      for (const [key, value] of Object.entries(strings)) {
        if (value === undefined || value === null) continue
        out.strings[key] = String(value)
      }
    }

    if (files) {
      for (const [key, value] of Object.entries(files)) {
        if (value === undefined || value === null) continue
        out.files[key] = String(value)
      }
    }

    return out
  }

  const plain = data as Record<string, unknown>
  const out: SecretBundle = { strings: {}, files: {} }

  for (const [key, value] of Object.entries(plain)) {
    if (value === undefined || value === null) continue
    out.strings[key] = String(value)
  }

  return out
}

const readSecretsFile = (filePath: string): SecretBundle => {
  if (!fs.existsSync(filePath)) return { strings: {}, files: {} }
  const raw = fs.readFileSync(filePath, 'utf8')
  return normalizeSecrets(JSON5.parse(raw) as unknown)
}

const loadSecretsFromJson5 = (repoRoot: string, profile: string): SecretBundle => {
  const sharedPath = path.resolve(repoRoot, '.github-secrets.private.json5')
  const profilePath = path.resolve(repoRoot, `.github-secrets.private.${profile}.json5`)

  const shared = readSecretsFile(sharedPath)
  const scoped = readSecretsFile(profilePath)

  return {
    strings: { ...shared.strings, ...scoped.strings },
    files: { ...shared.files, ...scoped.files },
  }
}

const hasJson5SecretsForProfile = (repoRoot: string, profile: string) => {
  const sharedPath = path.resolve(repoRoot, '.github-secrets.private.json5')
  const profilePath = path.resolve(repoRoot, `.github-secrets.private.${profile}.json5`)

  return fs.existsSync(sharedPath) || fs.existsSync(profilePath)
}

export const loadBackendScriptEnvironment = (scriptDir: string) => {
  const envProfileArgIndex = process.argv.indexOf('--env')
  const envProfile =
    (envProfileArgIndex !== -1 ? process.argv[envProfileArgIndex + 1] : process.env.ENV_PROFILE) ||
    'local'

  process.env.ENV_PROFILE = String(envProfile)

  const backendDir = path.resolve(scriptDir, '..')
  const repoRoot = path.resolve(scriptDir, '../..')
  const shouldLoadGithubSecrets =
    process.env.USE_GITHUB_SECRETS === 'true' ||
    (envProfile !== 'local' && hasJson5SecretsForProfile(repoRoot, String(envProfile)))

  if (shouldLoadGithubSecrets) {
    const bundle = loadSecretsFromJson5(repoRoot, String(envProfile))

    for (const [key, value] of Object.entries(bundle.strings)) {
      if (process.env[key] === undefined || process.env[key] === '') {
        process.env[key] = value
      }
    }

    if (!process.env.S3_AWS_ACCESS_KEY_ID && process.env.AWS_ACCESS_KEY_ID) {
      process.env.S3_AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID
    }
    if (!process.env.S3_AWS_SECRET_ACCESS_KEY && process.env.AWS_SECRET_ACCESS_KEY) {
      process.env.S3_AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY
    }
  }

  const dotenvProfilePath = path.resolve(backendDir, `.env.${envProfile}`)
  if (fs.existsSync(dotenvProfilePath)) {
    dotenv.config({ path: dotenvProfilePath })
  }

  const dotenvPath = path.resolve(backendDir, '.env')
  if (fs.existsSync(dotenvPath)) {
    dotenv.config({ path: dotenvPath })
  }

  return {
    backendDir,
    envProfile: String(envProfile),
    repoRoot,
  }
}
