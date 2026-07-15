import type { CollectionConfig } from 'payload'
import slugify from 'slugify'

import { scheduleFrontendCvRevalidate } from '../utils/triggerFrontendCvRevalidate'

const CV_SECTION_OPTIONS = [
  {
    label: 'Experience',
    value: 'experience',
  },
  {
    label: 'Independent R&D',
    value: 'independent-rd',
  },
]

export const CvExperienceItems: CollectionConfig = {
  slug: 'cvExperienceItems',
  labels: {
    singular: 'CV Experience Item',
    plural: 'CV Experience Items',
  },
  admin: {
    useAsTitle: 'adminTitle',
    defaultColumns: ['adminTitle', 'section', 'position', 'slug', 'active'],
  },
  versions: {
    drafts: true,
  },
  access: {
    read: ({ req }) => req.user?.role === 'admin',
    create: ({ req }) => req.user?.role === 'admin',
    update: ({ req }) => req.user?.role === 'admin',
    delete: ({ req }) => req.user?.role === 'admin',
  },
  hooks: {
    beforeChange: [
      ({ data }) => {
        const company = typeof data?.company === 'string' ? data.company.trim() : ''
        const title = typeof data?.title === 'string' ? data.title.trim() : ''

        data.adminTitle = [company, title].filter(Boolean).join(' — ') || undefined

        if (!data.slug && company && title) {
          data.slug = slugify(`${company}-${title}`, {
            lower: true,
            strict: true,
            trim: true,
          })
        }

        return data
      },
    ],
    afterChange: [
      async () => {
        await scheduleFrontendCvRevalidate('cvExperienceItems.afterChange', {
          warmPaths: ['/cv'],
        })
      },
    ],
    afterDelete: [
      async () => {
        await scheduleFrontendCvRevalidate('cvExperienceItems.afterDelete', {
          warmPaths: ['/cv'],
        })
      },
    ],
  },
  fields: [
    {
      name: 'adminTitle',
      label: 'Admin List Title',
      type: 'text',
      required: false,
      admin: {
        hidden: true,
        readOnly: true,
      },
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        description: 'Stable authored identifier used for imports, exports, and migrations.',
      },
    },
    {
      name: 'section',
      type: 'select',
      required: true,
      defaultValue: 'experience',
      options: CV_SECTION_OPTIONS,
    },
    {
      name: 'position',
      type: 'number',
      required: true,
      defaultValue: 10,
      admin: {
        description: 'Lower numbers render first within the selected CV section.',
      },
    },
    {
      name: 'active',
      type: 'checkbox',
      required: true,
      defaultValue: true,
    },
    {
      name: 'logo',
      label: 'Logo Upload',
      type: 'upload',
      relationTo: 'cvExperienceLogos',
      required: false,
    },
    {
      name: 'company',
      type: 'text',
      required: true,
    },
    {
      name: 'location',
      type: 'text',
      required: true,
    },
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'description',
      type: 'text',
      required: true,
    },
    {
      name: 'technicalScope',
      label: 'Technical Scope',
      type: 'text',
      required: true,
    },
    {
      name: 'date',
      type: 'text',
      required: true,
    },
    {
      name: 'bulletPoints',
      label: 'Bullet Points',
      type: 'array',
      required: false,
      fields: [
        {
          name: 'text',
          type: 'text',
          required: true,
        },
        {
          name: 'enabled',
          type: 'checkbox',
          defaultValue: true,
          required: true,
        },
      ],
    },
  ],
}

export default CvExperienceItems
