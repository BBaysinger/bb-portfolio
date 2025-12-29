import type { CollectionConfig, Where } from 'payload'
import slugify from 'slugify'

import { canReadNdaField } from '../access/nda'
import { generateShortCode } from '../utils/shortCode'

export const Projects: CollectionConfig = {
  slug: 'projects',
  admin: {
    useAsTitle: 'title',
    // Put title in the first column (click target) and move sort order to the second column
    defaultColumns: ['title', 'sortIndex', 'slug', 'active', 'brandId'],
  },
  access: {
    // Public can read active projects; NDA fields rely on per-field access rules below.
    // Logged-in users can read active projects (including NDA) with full fields.
    // Admins can read all fields unmodified.
    read: ({ req }) => {
      // Admins: unrestricted
      if (req.user?.role === 'admin') return true

      // Any authenticated user: restrict to active projects only
      if (req.user) {
        return {
          and: [{ active: { equals: true } }],
        } as unknown as Where
      }

      // Unauthenticated: restrict to active only (NDA allowed); field-level access redacts NDA data
      return {
        and: [{ active: { equals: true } }],
      } as unknown as Where
    },
    // Only admins can create/update/delete projects
    create: ({ req }) => req.user?.role === 'admin',
    update: ({ req }) => req.user?.role === 'admin',
    delete: ({ req }) => req.user?.role === 'admin',
  },
  hooks: {
    afterRead: [
      // Ensure NDA placeholders work even when the NDA state is derived from the related brand.
      // - We intentionally keep `nda` readable publicly so the frontend can route to /nda/<code>/.
      // - We do NOT expose brand identity; we only normalize the NDA boolean.
      async ({ doc, req }) => {
        try {
          // Only needed for unauthenticated responses; authenticated users can see full data.
          if (req.user) return doc

          const record = doc as unknown as { nda?: boolean | null; brandId?: unknown }
          if (record.nda === true) return doc

          const brandRel = record.brandId
          const brandId = (() => {
            if (typeof brandRel === 'string' && brandRel.length > 0) return brandRel
            if (!brandRel || typeof brandRel !== 'object') return undefined
            const rel = brandRel as Record<string, unknown>
            const id = rel.id
            if (typeof id === 'string' && id.length > 0) return id
            const value = rel.value
            if (typeof value === 'string' && value.length > 0) return value
            return undefined
          })()

          if (!brandId) return doc

          const brand = await req.payload.findByID({
            collection: 'brands',
            id: brandId,
            depth: 0,
            disableErrors: true,
            overrideAccess: true,
          })

          if (brand?.nda === true) {
            ;(record as Record<string, unknown>).nda = true
          }
        } catch {
          // Fail open here: this hook is only for UX consistency (placeholders).
          // Field-level access still prevents data leakage.
        }

        return doc
      },
    ],
    beforeChange: [
      async ({ data, operation, req }) => {
        // Ensure every project has a stable, opaque identifier usable in URLs.
        // - Base62 short code: compact, URL-safe, environment-agnostic.
        // - Generated on create and backfilled on update if missing.
        if ((operation === 'create' || operation === 'update') && !data?.shortCode) {
          // Avoid rare collisions by checking existing docs.
          const maxAttempts = 10
          for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            const candidate = generateShortCode(10)
            const res = await req.payload.find({
              collection: 'projects',
              where: { shortCode: { equals: candidate } },
              depth: 0,
              limit: 1,
              overrideAccess: true,
              disableErrors: true,
            })
            if (!res.docs?.length) {
              data.shortCode = candidate
              break
            }
          }

          if (!data.shortCode) {
            throw new Error('Failed to generate a unique short code for this project.')
          }
        }

        // Slug is the human-friendly route key derived from title.
        // (The opaque shortCode is the alternate route key.)
        if ((operation === 'create' || operation === 'update') && data?.title && !data?.slug) {
          data.slug = slugify(data.title, {
            lower: true,
            strict: true,
            trim: true,
          })
        }
        return data
      },
    ],
  },
  fields: [
    {
      name: 'sortIndex',
      label: 'Sort Order',
      type: 'number',
      defaultValue: 0,
      admin: {
        description: 'Lower numbers appear first in the portfolio list.',
      },
    },
    {
      name: 'title',
      type: 'text',
      required: true,
      access: {
        read: canReadNdaField,
      },
    },
    {
      name: 'shortTitle',
      label: 'Short Title (H1)',
      type: 'text',
      required: false,
      access: {
        read: canReadNdaField,
      },
      admin: {
        description:
          'Optional display title for the H1. Slugs and canonical project naming should still be based on Title.',
      },
    },
    {
      name: 'shortDesc',
      label: 'Short Description',
      type: 'textarea',
      required: false,
      access: {
        read: canReadNdaField,
      },
      admin: {
        rows: 3,
        description:
          'Optional brief blurb used for list cards/preview contexts. Keep this to 1–2 sentences.',
      },
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      access: {
        read: canReadNdaField,
      },
    },
    {
      name: 'shortCode',
      label: 'Short Code (URL Key)',
      type: 'text',
      unique: true,
      required: true,
      admin: {
        readOnly: true,
        description:
          'Opaque URL-safe identifier. This can be used as an alternate route key (e.g., /nda/<code>/) without exposing the human slug.',
      },
    },
    {
      name: 'active',
      type: 'checkbox',
      defaultValue: true,
    },
    {
      name: 'omitFromList',
      type: 'checkbox',
      label: 'Omit from List',
      defaultValue: false,
    },
    {
      name: 'nda',
      label: 'NDA',
      type: 'checkbox',
      defaultValue: false,
    },
    {
      name: 'brandId',
      type: 'relationship',
      relationTo: 'brands', // optional: create a `brands` collection
      required: false,
      access: {
        read: canReadNdaField,
      },
    },
    {
      name: 'tags',
      type: 'array',
      label: 'Tags',
      access: {
        read: canReadNdaField,
      },
      fields: [
        {
          name: 'tag',
          type: 'text',
        },
      ],
    },
    {
      name: 'role',
      type: 'array',
      access: {
        read: canReadNdaField,
      },
      fields: [
        {
          name: 'value',
          type: 'text',
        },
      ],
    },
    {
      name: 'year',
      type: 'text',
      access: {
        read: canReadNdaField,
      },
    },
    {
      name: 'awards',
      type: 'array',
      access: {
        read: canReadNdaField,
      },
      fields: [
        {
          name: 'award',
          type: 'text',
        },
      ],
    },
    {
      name: 'type',
      type: 'text',
      access: {
        read: canReadNdaField,
      },
    },
    {
      name: 'desc',
      label: 'Description HTML Blocks',
      type: 'array',
      access: {
        read: canReadNdaField,
      },
      fields: [
        {
          name: 'block',
          type: 'textarea',
          label: 'HTML Block',
          admin: {
            rows: 6,
            description: 'Paste raw HTML like <p>...</p>.',
          },
        },
      ],
    },
    {
      name: 'urls',
      type: 'array',
      label: 'External URLs',
      access: {
        read: canReadNdaField,
      },
      fields: [
        {
          name: 'label',
          type: 'text',
          required: true,
        },
        {
          name: 'url',
          type: 'text',
          required: true,
        },
      ],
    },
    {
      name: 'screenshots',
      type: 'relationship',
      relationTo: 'projectScreenshots',
      hasMany: true,
      access: {
        read: canReadNdaField,
      },
      admin: {
        description: 'Associate desktop and mobile screenshots with this project.',
      },
    },
    {
      name: 'thumbnail',
      type: 'relationship',
      relationTo: 'projectThumbnails',
      hasMany: true,
      access: {
        read: canReadNdaField,
      },
      admin: {
        description: 'Associate a thumbnail with this project.',
      },
    },
    {
      name: 'lockedThumbnail',
      label: 'Locked/NDA Thumbnail',
      type: 'relationship',
      relationTo: 'projectThumbnails',
      hasMany: false,
      access: {
        // Locked/placeholder art should always be safe to expose publicly.
        read: () => true,
      },
      admin: {
        description:
          'Optional fallback shown when the project is locked to unauthenticated visitors.',
      },
    },
    {
      name: 'thumbnailBackgroundTheme',
      label: 'Thumbnail Background Theme',
      type: 'select',
      defaultValue: 'default',
      access: {
        read: canReadNdaField,
      },
      options: [
        { label: 'Default', value: 'default' },
        { label: 'Bez', value: 'bez' },
        { label: 'Maroon', value: 'maroon' },
        { label: 'Splay', value: 'splay' },
        { label: 'Arrow', value: 'arrow' },
        { label: 'Orange', value: 'orange' },
        { label: 'Asdf', value: 'asdf' },
        { label: 'Slots', value: 'slots' },
        { label: 'Holes', value: 'holes' },
        { label: 'Thin Bez', value: 'thin-bez' },
        { label: 'Screws', value: 'screws' },
        { label: 'No Bez', value: 'no-bez' },
      ],
      admin: {
        description: 'Sets the base/background class for the thumbnail wrapper.',
      },
    },
    {
      name: 'thumbnailAttributeTheme',
      label: 'Thumbnail Attribute Theme',
      type: 'select',
      defaultValue: 'default',
      access: {
        read: canReadNdaField,
      },
      options: [
        { label: 'Default', value: 'default' },
        { label: 'Badge Pop', value: 'badge-pop' },
        { label: 'Border Strong', value: 'border-strong' },
        { label: 'Glow', value: 'glow' },
        { label: 'Grain', value: 'grain' },
      ],
      admin: {
        description: 'Adds a detail/attribute class for overlays, borders, or effects.',
      },
    },
  ],
}
