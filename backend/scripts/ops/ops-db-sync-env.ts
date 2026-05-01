#!/usr/bin/env tsx

import { mkdir, writeFile } from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

import { EJSON } from 'bson'
import { MongoClient } from 'mongodb'

import { triggerFrontendProjectRevalidate } from '../../src/utils/triggerFrontendProjectRevalidate'
import { loadBackendScriptEnvironment } from '../lib/payload-script-env'

type EnvProfile = 'local' | 'dev' | 'prod'

type Options = {
  apply: boolean
  outputDir?: string
  sourceProfile: EnvProfile
  targetProfile: EnvProfile
}

type SnapshotSummary = {
  count: number
  maxUpdatedAt: string | null
  maxCreatedAt: string | null
}

const ENV_PROFILES: EnvProfile[] = ['local', 'dev', 'prod']

const SNAPSHOT_COLLECTIONS = [
  'projects',
  'project-brands',
  'brands',
  'cvexperiencelogos',
  'brandlogos',
  'projectscreenshots',
  'projectthumbnails',
  'globals',
]

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const scriptsRoot = path.resolve(__dirname, '..')
const backendRoot = path.resolve(__dirname, '../..')

const usage = () => {
  console.info(
    [
      'Usage: ops-db-sync-env.ts --source <local|dev|prod> --target <local|dev|prod> [options]',
      '',
      'Options:',
      '  --apply                  Overwrite the target environment after snapshotting it.',
      '  --dry-run                Snapshot and compare only. This is the default mode.',
      '  --output-dir <path>      Write snapshots under backend/<path> instead of dump/env-sync/...',
      '  -h, --help               Show this help text.',
    ].join('\n'),
  )
}

const isEnvProfile = (value: string): value is EnvProfile =>
  ENV_PROFILES.includes(value as EnvProfile)

const parseArgs = (): Options => {
  const args = process.argv.slice(2)
  let apply = false
  let outputDir: string | undefined
  let sourceProfile: EnvProfile | undefined
  let targetProfile: EnvProfile | undefined

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]

    if (arg === '--apply') {
      apply = true
      continue
    }

    if (arg === '--dry-run') {
      apply = false
      continue
    }

    if (arg === '--output-dir') {
      outputDir = args[index + 1]
      index += 1
      continue
    }

    if (arg === '--source') {
      const value = args[index + 1]
      if (!value || !isEnvProfile(value)) {
        throw new Error(`Expected --source to be one of: ${ENV_PROFILES.join(', ')}`)
      }
      sourceProfile = value
      index += 1
      continue
    }

    if (arg === '--target') {
      const value = args[index + 1]
      if (!value || !isEnvProfile(value)) {
        throw new Error(`Expected --target to be one of: ${ENV_PROFILES.join(', ')}`)
      }
      targetProfile = value
      index += 1
      continue
    }

    if (arg === '--help' || arg === '-h') {
      usage()
      process.exit(0)
    }

    throw new Error(`Unknown argument: ${arg}`)
  }

  if (!sourceProfile || !targetProfile) {
    throw new Error('Both --source and --target are required.')
  }

  if (sourceProfile === targetProfile) {
    throw new Error('Source and target must be different environments.')
  }

  return { apply, outputDir, sourceProfile, targetProfile }
}

const restoreProcessEnv = (snapshot: NodeJS.ProcessEnv) => {
  for (const key of Object.keys(process.env)) {
    if (!(key in snapshot)) {
      delete process.env[key]
    }
  }

  for (const [key, value] of Object.entries(snapshot)) {
    if (value === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = value
    }
  }
}

const PROFILE_ENV_KEYS = [
  'MONGODB_URI',
  'FRONTEND_URL',
  'PUBLIC_SERVER_URL',
  'FRONTEND_PROJECTS_REVALIDATE_SECRET',
  'FRONTEND_PROJECTS_REVALIDATE_URL',
  'SKIP_FRONTEND_REVALIDATE',
]

const readProcessEnv = (key: string) => {
  const env = process.env as Record<string, string | undefined>
  return env[key]
}

const runWithProfileEnvironment = async <T>(profile: EnvProfile, action: () => Promise<T> | T) => {
  const envSnapshot = { ...process.env }
  const env = process.env as Record<string, string | undefined>

  try {
    env.ENV_PROFILE = profile

    if (profile === 'local') {
      delete env.USE_GITHUB_SECRETS
    } else {
      env.USE_GITHUB_SECRETS = 'true'
    }

    for (const key of PROFILE_ENV_KEYS) {
      delete env[key]
    }

    loadBackendScriptEnvironment(scriptsRoot)

    return await action()
  } finally {
    restoreProcessEnv(envSnapshot)
  }
}

const loadMongoUriForProfile = (profile: EnvProfile) => {
  return runWithProfileEnvironment(profile, () => {
    const rawUri = readProcessEnv('MONGODB_URI')
    const uri = typeof rawUri === 'string' ? rawUri.trim() : ''
    if (!uri) {
      throw new Error(`Missing MONGODB_URI for profile '${profile}'.`)
    }

    return uri
  })
}

const isoDate = (value: unknown) => {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(String(value))
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

const listCollectionNames = async (client: MongoClient) => {
  const collections = await client.db().listCollections({}, { nameOnly: true }).toArray()
  return collections
    .map((collection) => collection.name)
    .filter((name): name is string => Boolean(name))
    .sort((left, right) => left.localeCompare(right))
}

const collectionExists = async (client: MongoClient, name: string) => {
  const matches = await client.db().listCollections({ name }, { nameOnly: true }).toArray()
  return matches.length > 0
}

const summarizeCollection = async (
  client: MongoClient,
  collectionName: string,
): Promise<SnapshotSummary> => {
  const db = client.db()
  const collection = db.collection(collectionName)

  const count = await collection.countDocuments({})
  const [aggregate] = await collection
    .aggregate([
      {
        $group: {
          _id: null,
          maxUpdatedAt: { $max: '$updatedAt' },
          maxCreatedAt: { $max: '$createdAt' },
        },
      },
    ])
    .toArray()

  return {
    count,
    maxUpdatedAt: isoDate(aggregate?.maxUpdatedAt ?? null),
    maxCreatedAt: isoDate(aggregate?.maxCreatedAt ?? null),
  }
}

const exportCollectionSnapshot = async (
  client: MongoClient,
  collectionName: string,
  directoryPath: string,
) => {
  const db = client.db()
  const docs = await db.collection(collectionName).find({}).toArray()
  const filePath = path.join(directoryPath, `${collectionName}.ejson`)
  await writeFile(filePath, EJSON.stringify(docs, undefined, 2, { relaxed: false }), 'utf8')
  return docs
}

const replaceTargetCollection = async (
  client: MongoClient,
  collectionName: string,
  sourceDocs: Record<string, unknown>[],
  targetCollectionExists: boolean,
) => {
  const db = client.db()
  if (!targetCollectionExists) {
    await db.createCollection(collectionName)
  }

  const collection = db.collection(collectionName)

  await collection.deleteMany({})
  if (sourceDocs.length > 0) {
    await collection.insertMany(sourceDocs, { ordered: true })
  }
}

const dropCollectionIfExists = async (client: MongoClient, collectionName: string) => {
  const db = client.db()
  const existingCollections = await db
    .listCollections({ name: collectionName }, { nameOnly: true })
    .toArray()

  if (existingCollections.length === 0) return false

  await db.dropCollection(collectionName)
  return true
}

const snapshotCollections = async (
  client: MongoClient,
  collectionNames: string[],
  directoryPath: string,
) => {
  for (const name of collectionNames) {
    if (!(await collectionExists(client, name))) continue
    await exportCollectionSnapshot(client, name, directoryPath)
  }
}

async function main() {
  const options = parseArgs()
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const defaultSnapshotRoot = path.resolve(
    backendRoot,
    'dump',
    'env-sync',
    `${options.sourceProfile}-to-${options.targetProfile}`,
    timestamp,
  )
  const snapshotRoot = options.outputDir
    ? path.resolve(backendRoot, options.outputDir)
    : defaultSnapshotRoot
  const sourceSnapshotDir = path.join(snapshotRoot, `${options.sourceProfile}-source`)
  const targetSnapshotDir = path.join(snapshotRoot, `${options.targetProfile}-before`)

  await mkdir(sourceSnapshotDir, { recursive: true })
  await mkdir(targetSnapshotDir, { recursive: true })

  const sourceUri = await loadMongoUriForProfile(options.sourceProfile)
  const targetUri = await loadMongoUriForProfile(options.targetProfile)

  const sourceClient = new MongoClient(sourceUri, {
    readPreference: options.sourceProfile === 'local' ? undefined : 'secondaryPreferred',
  })
  const targetClient = new MongoClient(targetUri)

  try {
    await sourceClient.connect()
    await targetClient.connect()

    console.info(`Snapshot root: ${snapshotRoot}`)
    console.info(options.apply ? 'Mode: APPLY (target will be overwritten)' : 'Mode: DRY RUN')
    console.info(`Source profile: ${options.sourceProfile}`)
    console.info(`Target profile: ${options.targetProfile}`)
    console.info(`Source DB: ${sourceClient.db().databaseName}`)
    console.info(`Target DB: ${targetClient.db().databaseName}`)

    const sourceCollectionNames = await listCollectionNames(sourceClient)
    const targetCollectionNames = await listCollectionNames(targetClient)
    const mirroredCollectionNames = Array.from(
      new Set([...sourceCollectionNames, ...targetCollectionNames]),
    ).sort((left, right) => left.localeCompare(right))
    const snapshotCollectionNames = SNAPSHOT_COLLECTIONS.filter(
      (name) => sourceCollectionNames.includes(name) || targetCollectionNames.includes(name),
    )

    await snapshotCollections(sourceClient, snapshotCollectionNames, sourceSnapshotDir)
    await snapshotCollections(targetClient, snapshotCollectionNames, targetSnapshotDir)

    console.info(
      `Mirroring ${mirroredCollectionNames.length} collections from source to target database state.`,
    )
    if (snapshotCollectionNames.length > 0) {
      console.info(
        `Local snapshots remain limited to ${snapshotCollectionNames.length} existing saved collections.`,
      )
    }

    for (const collectionName of mirroredCollectionNames) {
      const sourceExists = sourceCollectionNames.includes(collectionName)
      const targetExists = targetCollectionNames.includes(collectionName)
      const sourceSummary = sourceExists
        ? await summarizeCollection(sourceClient, collectionName)
        : { count: 0, maxUpdatedAt: null, maxCreatedAt: null }
      const targetSummary = targetExists
        ? await summarizeCollection(targetClient, collectionName)
        : { count: 0, maxUpdatedAt: null, maxCreatedAt: null }
      const plannedAction = sourceExists ? (targetExists ? 'replace' : 'create') : 'drop'

      console.info(
        [
          `${collectionName}:`,
          `action=${plannedAction}`,
          `source collection=${sourceExists ? collectionName : '(missing)'}`,
          `source count=${sourceSummary.count} updated=${sourceSummary.maxUpdatedAt ?? 'n/a'}`,
          `target collection=${targetExists ? collectionName : '(missing)'}`,
          `target count=${targetSummary.count} updated=${targetSummary.maxUpdatedAt ?? 'n/a'}`,
        ].join(' '),
      )
    }

    if (!options.apply) {
      console.info('Dry run complete. Snapshots were exported, but the target was not modified.')
      return
    }

    for (const collectionName of mirroredCollectionNames) {
      const sourceExists = sourceCollectionNames.includes(collectionName)
      const targetExists = targetCollectionNames.includes(collectionName)

      if (!sourceExists) {
        const dropped = await dropCollectionIfExists(targetClient, collectionName)
        if (dropped) {
          console.info(`Dropped target-only collection '${collectionName}'.`)
        }
        continue
      }

      const sourceDocs = (await sourceClient
        .db()
        .collection(collectionName)
        .find({})
        .toArray()) as Record<string, unknown>[]
      await replaceTargetCollection(targetClient, collectionName, sourceDocs, targetExists)
    }

    console.info(
      `Database collections copied from ${options.sourceProfile} to ${options.targetProfile} successfully.`,
    )
    console.info(`Target backup remains in ${targetSnapshotDir}`)

    await runWithProfileEnvironment(options.targetProfile, async () => {
      await triggerFrontendProjectRevalidate(
        `env-sync:${options.sourceProfile}-to-${options.targetProfile}`,
        {
          warmPaths: ['/', '/cv'],
        },
      )
    })
    console.info(`Frontend project revalidation requested for ${options.targetProfile}.`)
  } finally {
    await sourceClient.close()
    await targetClient.close()
  }
}

void main()
