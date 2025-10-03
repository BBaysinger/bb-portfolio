import { promises as fs } from 'fs'
import path from 'path'

import type { CollectionConfig } from 'payload'

type OverwriteMeta = {
  screenType?: 'laptop' | 'phone'
  orientation?: 'portrait' | 'landscape'
  project?: string
  alt?: string | null
}

export const ProjectScreenshots: CollectionConfig = {
  slug: 'projectScreenshots',
  labels: {
    singular: 'Project Screenshot',
    plural: 'Project Screenshots',
  },
  upload: {
    staticDir: 'media/project-screenshots',
    mimeTypes: ['image/webp'],
    imageSizes: [
      {
        name: 'thumbnail',
        width: 800,
        height: 600,
        position: 'centre',
      },
    ],
    adminThumbnail: 'thumbnail',
  },
  admin: {
    useAsTitle: 'filename',
  },
  access: {
    read: () => true,
    create: ({ req }) => req.user?.role === 'admin',
    update: ({ req }) => req.user?.role === 'admin',
    delete: ({ req }) => req.user?.role === 'admin',
  },
  fields: [
    {
      name: 'screenType',
      type: 'select',
      required: true,
      options: [
        { label: 'Laptop', value: 'laptop' },
        { label: 'Phone', value: 'phone' },
      ],
      admin: {
        description: 'Indicates whether the screenshot is for desktop or mobile view.',
      },
    },
    {
      name: 'orientation',
      type: 'select',
      required: true,
      options: [
        { label: 'Portrait', value: 'portrait' },
        { label: 'Landscape', value: 'landscape' },
      ],
    },
    {
      name: 'project',
      type: 'relationship',
      relationTo: 'projects',
      required: true,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'alt',
      type: 'text',
      required: false,
      admin: {
        description: 'Optional alt text for accessibility or SEO.',
      },
    },
  ],
  hooks: {
    beforeOperation: [
      // Overwrite behavior:
      // - On create with a file, find an existing doc by the same filename and delete it first.
      //   This allows the new upload to reuse the same filename (and S3 key) so the file is
      //   effectively replaced in-place.
      // - Capture selective metadata to re-apply in `beforeChange` so you don't lose fields
      //   like screenType/orientation/alt/project that were already set on the prior doc.
      //
      // Caveats & future considerations:
      // - Overwriting is destructive without object-storage versioning; enable S3 versioning if
      //   you need rollback. Otherwise prefer unique filenames per change.
      // - CDN cache: Keep immutable caching on the media route/objects but ensure the frontend
      //   changes the URL on content change (e.g., `?v=<updatedAt>`). Verify CDN includes query
      //   strings in cache keys.
      // - Filename normalization strips trailing counters ("-1"). Adjust if your workflow
      //   requires preserving those literal suffixes.
      // - Local dev: We unlink the old file from backend/media to avoid local adapter suffixing.
      // - Env gating via OVERWRITE_MEDIA_ON_CREATE; defaults enabled for local/dev, disabled in prod.
      // - Future: Consider a shared helper, optional update-time overwrite, and audit/webhook events.
      async ({ args, operation, req, context }) => {
        try {
          const envProfile = process.env.ENV_PROFILE || 'local'
          const overwriteEnabled = process.env.OVERWRITE_MEDIA_ON_CREATE
            ? process.env.OVERWRITE_MEDIA_ON_CREATE === 'true'
            : envProfile !== 'prod'

          if (!overwriteEnabled) return args

          if (operation === 'create' && req.file?.name) {
            // Normalize filename to avoid Payload auto-suffixing (e.g., "-1") and force the name
            const stripCounterSuffix = (name: string) => {
              const lastDot = name.lastIndexOf('.')
              if (lastDot <= 0) return name
              const base = name.slice(0, lastDot)
              const ext = name.slice(lastDot)
              const m = base.match(/^(.*?)-(\d+)$/)
              return m ? `${m[1]}${ext}` : name
            }
            const filename = stripCounterSuffix(req.file.name)
            req.file.name = filename
            // Remove any pre-existing local file to prevent counter suffixing in local env
            if (envProfile !== 'dev' && envProfile !== 'prod') {
              const staticDir = path.join(process.cwd(), 'media', 'project-screenshots')
              try {
                await fs.unlink(path.join(staticDir, filename))
              } catch {}
            }
            const existing = await req.payload.find({
              collection: 'projectScreenshots',
              where: { filename: { equals: filename } },
              limit: 100,
              depth: 0,
            })
            if (existing?.docs?.length) {
              // Preserve fields you likely want to keep on replacement
              const doc = existing.docs[0] as unknown as {
                screenType?: 'laptop' | 'phone'
                orientation?: 'portrait' | 'landscape'
                project?: string | { value?: string | undefined } | undefined
                alt?: string | null
              }
              const projectVal =
                typeof doc.project === 'object' && doc.project
                  ? (doc.project as { value?: string | undefined }).value
                  : (doc.project as string | undefined)
              ;(context as Record<string, unknown>).__overwriteMeta = {
                screenType: doc.screenType,
                orientation: doc.orientation,
                project: projectVal,
                alt: doc.alt,
              } as OverwriteMeta
              for (const d of existing.docs) {
                await req.payload.delete({ collection: 'projectScreenshots', id: d.id })
              }
            }
          }
        } catch (e) {
          console.warn('[projectScreenshots] overwrite check failed:', e)
        }
        return args
      },
    ],
    beforeChange: [
      // Validate file type and re-apply overwrite metadata
      async ({ data, req, context }) => {
        // Security: Validate file type on server side
        if (req.file && req.file.mimetype) {
          const allowedTypes = ['image/webp']
          if (!allowedTypes.includes(req.file.mimetype)) {
            throw new Error('Invalid file type. Only WebP files are allowed.')
          }
        }
        // Re-apply any preserved metadata from `beforeOperation` unless the incoming
        // payload explicitly sets those fields.
        if (context && (context as Record<string, unknown>).__overwriteMeta) {
          const meta = (context as Record<string, unknown>).__overwriteMeta as OverwriteMeta
          data = {
            ...meta,
            ...data,
          }
        }
        return data
      },
      // Enforce only one screenshot per screenType for a given project
      async ({ data, operation, req, originalDoc }) => {
        try {
          const projectId = (data as OverwriteMeta)?.project as string | undefined
          const screenType = (data as OverwriteMeta)?.screenType as 'laptop' | 'phone' | undefined
          if (!projectId || !screenType) return data

          const existing = await req.payload.find({
            collection: 'projectScreenshots',
            where: {
              and: [{ project: { equals: projectId } }, { screenType: { equals: screenType } }],
            },
            limit: 2,
            depth: 0,
          })

          const currentId = operation === 'update' ? originalDoc?.id : undefined
          const conflict = existing.docs.find((d) => d.id !== currentId)
          if (conflict) {
            throw new Error(
              `Only one ${screenType} screenshot is allowed per project. Delete or replace the existing ${screenType} screenshot first.`,
            )
          }
        } catch (e) {
          // Re-throw to surface validation error in admin UI/API
          throw e
        }
        return data
      },
    ],
    beforeValidate: [
      ({ data }) => {
        if (data) {
          if (!data.orientation && data.screenType) {
            data.orientation = data.screenType === 'phone' ? 'portrait' : 'landscape'
          }
        }
        return data
      },
    ],
  },
}

export default ProjectScreenshots
