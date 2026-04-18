import type { CollectionConfig } from 'payload'

import { triggerFrontendProjectRevalidate } from '../utils/triggerFrontendProjectRevalidate'

export const CvExperienceLogos: CollectionConfig = {
  slug: 'cvExperienceLogos',
  hooks: {
    afterChange: [
      async () => {
        await triggerFrontendProjectRevalidate('cvExperienceLogos.afterChange')
      },
    ],
    afterDelete: [
      async () => {
        await triggerFrontendProjectRevalidate('cvExperienceLogos.afterDelete')
      },
    ],
  },
  labels: {
    singular: 'CV Experience Logo',
    plural: 'CV Experience Logos',
  },
  upload: {
    staticDir: 'media/cv-experience-logos',
    mimeTypes: ['image/webp', 'image/svg+xml', 'image/png', 'image/jpeg'],
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
      name: 'alt',
      type: 'text',
      required: false,
      admin: {
        description: 'Accessible description for the CV logo.',
      },
    },
  ],
}

export default CvExperienceLogos
