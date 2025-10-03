import { promises as fs } from 'fs'
import path from 'path'

import type { CollectionConfig } from 'payload'

type OverwriteMeta = {
  project?: string
  alt?: string | null
}

export const ProjectThumbnails: CollectionConfig = {
  slug: 'projectThumbnails',
  labels: {
    singular: 'Project Thumbnail',
    plural: 'Project Thumbnails',
  },
  upload: {
    staticDir: 'media/project-thumbnails', // saved to backend/media/project-thumbnails
    mimeTypes: ['image/webp'],
    imageSizes: [
      {
        name: 'mobile',
        width: 400,
        height: 300,
        position: 'centre',
      },
      {
        name: 'thumbnail', // Keep existing name for admin interface
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
  hooks: {
    beforeOperation: [
      // Overwrite behavior:
      // - On create with a file, delete any existing doc with the same filename so we can reuse
      //   the filename/Key and replace the stored object in-place.
      // - Save simple metadata we want to retain across the replacement (project, alt).
      //
      // Caveats & future considerations:
      // - Destructive without object-store versioning. Enable S3 versioning if rollback is needed.
      // - CDN caching remains immutable; frontend should append a version query param to bust.
      // - Normalization removes trailing counters like "-1". Adjust if you rely on them.
      // - Local unlink avoids filesystem-based auto-suffixing.
      // - Env gating via OVERWRITE_MEDIA_ON_CREATE; default enabled local/dev, disabled prod.
      // - Future: shared helper, update-time overwrite option, and audit/webhook signals.
      async ({ args, operation, req, context }) => {
        try {
          const envProfile = process.env.ENV_PROFILE || 'local'
          const overwriteEnabled = process.env.OVERWRITE_MEDIA_ON_CREATE
            ? process.env.OVERWRITE_MEDIA_ON_CREATE === 'true'
            : envProfile !== 'prod'

          if (!overwriteEnabled) return args

          if (operation === 'create' && req.file?.name) {
            // Normalize filename to avoid auto-suffixing like "-1" when re-uploading
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
              const staticDir = path.join(process.cwd(), 'media', 'project-thumbnails')
              try {
                await fs.unlink(path.join(staticDir, filename))
              } catch {}
            }
            const existing = await req.payload.find({
              collection: 'projectThumbnails',
              where: { filename: { equals: filename } },
              limit: 100,
              depth: 0,
            })
            if (existing?.docs?.length) {
              // Preserve project relationship (value) and alt text for the next upload
              const doc = existing.docs[0] as unknown as {
                project?: string | { value?: string }
                alt?: string | null
              }
              const projectVal =
                typeof doc.project === 'object' && doc.project
                  ? (doc.project as { value?: string | undefined }).value
                  : (doc.project as string | undefined)
              ;(context as Record<string, unknown>).__overwriteMeta = {
                project: projectVal,
                alt: doc.alt ?? undefined,
              } satisfies OverwriteMeta
              for (const d of existing.docs) {
                await req.payload.delete({ collection: 'projectThumbnails', id: d.id })
              }
            }
          }
        } catch (e) {
          console.warn('[projectThumbnails] overwrite check failed:', e)
        }
        return args
      },
    ],
    beforeChange: [
      async ({ data, req, context }) => {
        // Security: Validate file type on server side
        if (req.file && req.file.mimetype) {
          const allowedTypes = ['image/webp']
          if (!allowedTypes.includes(req.file.mimetype)) {
            throw new Error('Invalid file type. Only WebP files are allowed.')
          }
        }
        // Re-apply preserved metadata from `beforeOperation` unless explicitly overridden
        if (context && (context as Record<string, unknown>).__overwriteMeta) {
          const meta = (context as Record<string, unknown>).__overwriteMeta as OverwriteMeta
          data = {
            ...meta,
            ...data,
          }
        }
        return data
      },
    ],
  },
  fields: [
    {
      name: 'project',
      type: 'relationship',
      relationTo: 'projects',
      required: false,
    },
    {
      name: 'alt',
      type: 'text',
      required: false,
      admin: {
        description: 'Accessible text for screen readers and SEO.',
      },
    },
  ],
}
