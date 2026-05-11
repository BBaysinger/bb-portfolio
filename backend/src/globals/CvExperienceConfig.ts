import type { GlobalConfig } from 'payload'

import { triggerFrontendProjectRevalidate } from '../utils/triggerFrontendProjectRevalidate'

export const CvExperienceConfig: GlobalConfig = {
  slug: 'cvExperienceConfig',
  label: 'CV Experience Config',
  hooks: {
    afterChange: [
      async () => {
        await triggerFrontendProjectRevalidate('cvExperienceConfig.afterChange', {
          warmPaths: ['/cv/'],
        })
      },
    ],
  },
  access: {
    read: ({ req }) => req.user?.role === 'admin',
    update: ({ req }) => req.user?.role === 'admin',
  },
  fields: [
    {
      name: 'experienceSectionHeading',
      label: 'Experience Section Heading',
      type: 'text',
      required: true,
      defaultValue: 'Experience',
    },
    {
      name: 'recentIndependentStudySectionHeading',
      label: 'Independent R&D / Freelance Section Heading',
      type: 'text',
      required: true,
      defaultValue: 'Independent R&D',
    },
  ],
}

export default CvExperienceConfig
