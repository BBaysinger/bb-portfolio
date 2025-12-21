import { promises as fs } from 'fs'
import path from 'path'

import type { CollectionConfig, Where } from 'payload'

type OverwriteMeta = { alt?: string | null; logoType?: string | null }

export const BrandLogos: CollectionConfig = {
  slug: 'brandLogos',
  labels: {
    singular: 'Brand Logo',
    plural: 'Brand Logos',
  },
  upload: {
    staticDir: 'media/brand-logos', // This will resolve to <projectRoot>/media/brand-logos
    mimeTypes: ['image/webp', 'image/svg+xml'],
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
    read: ({ req }) => {
      if (req.user?.role === 'admin') return true
      if (req.user) return true
      return {
        nda: {
          equals: false,
        },
      } as unknown as Where
    },
    create: ({ req }) => req.user?.role === 'admin',
    update: ({ req }) => req.user?.role === 'admin',
    delete: ({ req }) => req.user?.role === 'admin',
  },
  hooks: {
    beforeOperation: [
      // Overwrite behavior:
      // - When creating an upload, if a document already exists with the exact same filename,
      //   we pre-delete that document so the new upload can reuse the same filename (and S3 key)
      //   without generating a suffixed name. This results in "saving over" the older file.
      // - Before deleting, we stash select metadata into the hook `context` so we can restore
      //   values like alt/logoType in `beforeChange` below.
      //
      // Caveats & future considerations:
      // - Risk: Overwriting by filename permanently removes the prior object. If you need
      //   history, enable S3/Object Storage versioning or switch to unique filenames.
      // - Caching: Media endpoints (local and CDN) use long-lived immutable caching. To avoid
      //   stale assets, the frontend must change the URL when content changes (e.g., append
      //   `?v=<updatedAt>`). Ensure the CDN includes query strings in its cache key and forwards
      //   them to origin. With versioned URLs you generally don't need CDN invalidations.
      // - Normalization: We strip trailing "-N" counters so re-uploads reuse a stable key.
      //   If you truly want filenames that end with "-1" etc, adjust the normalization logic.
      // - Local dev: We unlink any pre-existing local file to prevent the filesystem adapter
      //   from auto-suffixing. If you still see suffixes, check for residual files on disk.
      // - Env gating: Controlled via OVERWRITE_MEDIA_ON_CREATE (defaults enabled for local/dev,
      //   disabled in prod). Treat enabling in prod as an explicit action.
      // - Future: Extract a shared helper for overwrite (normalize/delete/preserve/unlink),
      //   add update-time overwrite if needed, and consider audit logs/webhooks.
      async ({ args, operation, req, context }) => {
        try {
          const envProfile = process.env.ENV_PROFILE || 'local'
          // Enable via OVERWRITE_MEDIA_ON_CREATE or default to enabled for local/dev, disabled for prod
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
            // Force the incoming file to use the normalized name
            req.file.name = filename
            // Additional guard for local dev: remove any existing file from the staticDir so
            // Payload's local storage doesn't auto-append a counter based on the filesystem.
            if (envProfile !== 'dev' && envProfile !== 'prod') {
              const staticDir = path.join(process.cwd(), 'media', 'brand-logos')
              try {
                await fs.unlink(path.join(staticDir, filename))
              } catch {}
            }
            const existing = await req.payload.find({
              collection: 'brandLogos',
              where: { filename: { equals: filename } },
              limit: 100,
              depth: 0,
            })
            if (existing?.docs?.length) {
              // Preserve important metadata from the existing doc to re-apply on the new one
              const doc = existing.docs[0] as unknown as {
                alt?: string | null
                logoType?: string | null
              }
              ;(context as Record<string, unknown>).__overwriteMeta = {
                alt: doc.alt ?? undefined,
                logoType: doc.logoType ?? undefined,
              } satisfies OverwriteMeta
              // Delete all matching docs to prevent any uniqueness checks from suffixing
              for (const d of existing.docs) {
                await req.payload.delete({ collection: 'brandLogos', id: d.id })
              }
            }
          }
        } catch (e) {
          console.warn('[brandLogos] beforeOperation overwrite check failed:', e)
        }
        return args
      },
    ],
    beforeChange: [
      async ({ data, req, context }) => {
        // Security: Validate file type on server side
        if (req.file && req.file.mimetype) {
          const allowedTypes = ['image/webp', 'image/svg+xml']
          if (!allowedTypes.includes(req.file.mimetype)) {
            throw new Error('Invalid file type. Only WebP and SVG files are allowed.')
          }
        }
        // If we just deleted an older doc in `beforeOperation`, re-apply its metadata here
        // unless the incoming data explicitly overrides those fields.
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
      name: 'nda',
      label: 'NDA (Computed)',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        readOnly: true,
        description:
          'Computed from the brand that references this logo. Used to prevent public access to NDA logos via direct collection reads.',
      },
    },
    {
      name: 'alt',
      type: 'text',
      required: false,
      admin: {
        description: 'Accessible description of the logo (used for alt text).',
      },
    },
    {
      name: 'logoType',
      label: 'Logo Type',
      type: 'select',
      options: [
        { label: 'For Light Background', value: 'light-mode' },
        { label: 'For Dark Background', value: 'dark-mode' },
        { label: 'Works on Both', value: 'both-modes' },
      ],
      required: true,
      admin: {
        position: 'sidebar',
        description: 'Choose the background type this logo is intended for.',
      },
    },
  ],
}

export default BrandLogos
