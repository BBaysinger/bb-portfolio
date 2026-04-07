#!/usr/bin/env tsx

import path from 'path'
import { fileURLToPath } from 'url'

import { getPayload, type Payload } from 'payload'

import { loadBackendScriptEnvironment } from '../lib/payload-script-env'

type Options = {
  dryRun: boolean
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const scriptsRoot = path.resolve(__dirname, '..')

loadBackendScriptEnvironment(scriptsRoot)

const parseArgs = (): Options => {
  const args = process.argv.slice(2)
  return {
    dryRun: args.includes('--dry-run'),
  }
}

const getNativeDb = (payload: Payload) => {
  const db = (payload.db as { connection?: { db?: unknown } } | undefined)?.connection?.db
  if (!db || typeof db !== 'object') {
    throw new Error('Unable to access the native MongoDB database handle from Payload.')
  }

  return db as {
    collection: (name: string) => { countDocuments: () => Promise<number> }
    listCollections: (
      filter?: { name?: string },
      options?: { nameOnly?: boolean },
    ) => {
      toArray: () => Promise<Array<{ name: string }>>
    }
    dropCollection: (name: string) => Promise<boolean>
    renameCollection: (from: string, to: string) => Promise<unknown>
  }
}

async function main() {
  const options = parseArgs()
  let payload: Payload | null = null

  try {
    const { default: config } = await import('../../src/payload.config')
    payload = await getPayload({ config })

    const db = getNativeDb(payload)
    const oldName = 'brands'
    const newName = 'project-brands'

    const collections = await db.listCollections({}, { nameOnly: true }).toArray()
    const names = new Set(collections.map((entry) => entry.name))
    const hasOld = names.has(oldName)
    const hasNew = names.has(newName)
    const oldCount = hasOld ? await db.collection(oldName).countDocuments() : 0
    const newCount = hasNew ? await db.collection(newName).countDocuments() : 0

    if (!hasOld && hasNew) {
      console.info(
        `Collection '${newName}' already exists and '${oldName}' does not. Nothing to do.`,
      )
      return
    }

    if (!hasOld && !hasNew) {
      console.info(`Neither '${oldName}' nor '${newName}' exists. Nothing to do.`)
      return
    }

    if (hasOld && hasNew) {
      if (newCount > 0) {
        throw new Error(
          `Both '${oldName}' (${oldCount}) and '${newName}' (${newCount}) exist with data. Refusing automatic rename because manual reconciliation is required.`,
        )
      }

      console.info(
        `Collection '${newName}' already exists but is empty. Preparing to drop it before renaming '${oldName}'.`,
      )

      if (options.dryRun) {
        console.info(
          `Dry run: would drop empty collection '${newName}' and then rename '${oldName}' (${oldCount} document(s)).`,
        )
        return
      }

      await db.dropCollection(newName)
      await db.renameCollection(oldName, newName)
      console.info(`Dropped empty '${newName}' and renamed collection '${oldName}' → '${newName}'.`)
      return
    }

    console.info(
      `Preparing to rename collection '${oldName}' → '${newName}' (${oldCount} document(s)).`,
    )

    if (options.dryRun) {
      console.info('Dry run only. No database changes made.')
      return
    }

    await db.renameCollection(oldName, newName)
    console.info(`Renamed collection '${oldName}' → '${newName}'.`)
  } catch (error) {
    console.error('Failed to rename brands collection:', error)
    process.exitCode = 1
  } finally {
    if (payload) {
      await payload.db?.destroy?.()
    }
  }
}

void main()
