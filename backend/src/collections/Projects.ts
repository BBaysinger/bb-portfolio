import type { CollectionConfig, Where } from 'payload'
import slugify from 'slugify'

import { canReadNdaField } from '../access/nda'

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
    beforeChange: [
      ({ data, operation }) => {
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
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
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
    },
    {
      name: 'tags',
      type: 'array',
      label: 'Tags',
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
    },
    {
      name: 'awards',
      type: 'array',
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
      name: 'thumbnailTheme',
      label: 'Thumbnail Theme',
      type: 'select',
      defaultValue: 'default',
      options: [
        { label: 'Default', value: 'default' },
        { label: 'Muted Frame', value: 'muted-frame' },
        { label: 'High Contrast', value: 'high-contrast' },
        { label: 'Glass Panel', value: 'glass-panel' },
        { label: 'Neon Grid', value: 'neon-grid' },
      ],
      admin: {
        description: 'Adds a theme-specific CSS class to the thumbnail wrapper.',
      },
    },
  ],
}
