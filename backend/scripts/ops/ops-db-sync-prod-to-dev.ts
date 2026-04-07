#!/usr/bin/env tsx

import { mkdir, writeFile } from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

import { EJSON } from 'bson'
import { MongoClient } from 'mongodb'

import { loadBackendScriptEnvironment } from '../lib/payload-script-env'

type Options = {
  apply: boolean
  outputDir?: string
}

type CollectionSpec = {
  label: string
  mongoCollection: string
}

type SnapshotSummary = {
  count: number
  maxUpdatedAt: string | null
  maxCreatedAt: string | null
}

const COLLECTIONS: CollectionSpec[] = [
  { label: 'projects', mongoCollection: 'projects' },
  { label: 'brands', mongoCollection: 'brands' },
  { label: 'brandLogos', mongoCollection: 'brandlogos' },
  { label: 'projectScreenshots', mongoCollection: 'projectscreenshots' },
  { label: 'projectThumbnails', mongoCollection: 'projectthumbnails' },
]

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const scriptsRoot = path.resolve(__dirname, '..')
const backendRoot = path.resolve(__dirname, '../..')

const parseArgs = (): Options => {
  const args = process.argv.slice(2)
  let apply = false
  let outputDir: string | undefined

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]

    if (arg === '--apply') {
      apply = true
      continue
    }

    if (arg === '--output-dir') {
      outputDir = args[index + 1]
      index += 1
      continue
    }

    if (arg === '--dry-run') {
      apply = false
      continue
    }

    throw new Error(`Unknown argument: ${arg}`)
  }

  return { apply, outputDir }
}

const loadMongoUriForProfile = (profile: 'prod' | 'dev') => {
  process.env.USE_GITHUB_SECRETS = 'true'
  process.env.ENV_PROFILE = profile
  loadBackendScriptEnvironment(scriptsRoot)

  const uri = process.env.MONGODB_URI?.trim()
  if (!uri) {
    throw new Error(`Missing MONGODB_URI for profile '${profile}'.`)
  }

  return uri
}

const isoDate = (value: unknown) => {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(String(value))
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

const summarizeCollection = async (
  client: MongoClient,
  spec: CollectionSpec,
): Promise<SnapshotSummary> => {
  const db = client.db()
  const collection = db.collection(spec.mongoCollection)

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
  spec: CollectionSpec,
  directoryPath: string,
) => {
  const db = client.db()
  const docs = await db.collection(spec.mongoCollection).find({}).toArray()
  const filePath = path.join(directoryPath, `${spec.mongoCollection}.ejson`)
  await writeFile(filePath, EJSON.stringify(docs, undefined, 2, { relaxed: false }), 'utf8')
  return docs
}

const replaceTargetCollection = async (
  client: MongoClient,
  spec: CollectionSpec,
  sourceDocs: Record<string, unknown>[],
) => {
  const db = client.db()
  const collection = db.collection(spec.mongoCollection)

  await collection.deleteMany({})
  if (sourceDocs.length > 0) {
    await collection.insertMany(sourceDocs, { ordered: true })
  }
}

async function main() {
  const options = parseArgs()
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const snapshotRoot = options.outputDir
    ? path.resolve(backendRoot, options.outputDir)
    : path.resolve(backendRoot, 'dump', 'env-sync', timestamp)
  const prodSnapshotDir = path.join(snapshotRoot, 'prod-source')
  const devSnapshotDir = path.join(snapshotRoot, 'dev-before')

  await mkdir(prodSnapshotDir, { recursive: true })
  await mkdir(devSnapshotDir, { recursive: true })

  const prodUri = loadMongoUriForProfile('prod')
  const devUri = loadMongoUriForProfile('dev')

  const prodClient = new MongoClient(prodUri, { readPreference: 'secondaryPreferred' })
  const devClient = new MongoClient(devUri)

  try {
    await prodClient.connect()
    await devClient.connect()

    console.info(`Snapshot root: ${snapshotRoot}`)
    console.info(options.apply ? 'Mode: APPLY (dev will be overwritten)' : 'Mode: DRY RUN')

    const prodDbName = prodClient.db().databaseName
    const devDbName = devClient.db().databaseName
    console.info(`Source DB: ${prodDbName}`)
    console.info(`Target DB: ${devDbName}`)

    const prodExportedDocs = new Map<string, Record<string, unknown>[]>()

    for (const spec of COLLECTIONS) {
      const prodDocs = (await exportCollectionSnapshot(
        prodClient,
        spec,
        prodSnapshotDir,
      )) as Record<string, unknown>[]
      await exportCollectionSnapshot(devClient, spec, devSnapshotDir)
      prodExportedDocs.set(spec.mongoCollection, prodDocs)

      const prodSummary = await summarizeCollection(prodClient, spec)
      const devSummary = await summarizeCollection(devClient, spec)

      console.info(
        [
          `${spec.label}:`,
          `prod count=${prodSummary.count} updated=${prodSummary.maxUpdatedAt ?? 'n/a'}`,
          `dev count=${devSummary.count} updated=${devSummary.maxUpdatedAt ?? 'n/a'}`,
        ].join(' '),
      )
    }

    if (!options.apply) {
      console.info('Dry run complete. Snapshots were exported, but dev was not modified.')
      return
    }

    for (const spec of COLLECTIONS) {
      const docs = prodExportedDocs.get(spec.mongoCollection) ?? []
      await replaceTargetCollection(devClient, spec, docs)
    }

    console.info('Prod collections copied into dev successfully.')
    console.info(`Dev backup remains in ${devSnapshotDir}`)
  } finally {
    await prodClient.close()
    await devClient.close()
  }
}

void main()
