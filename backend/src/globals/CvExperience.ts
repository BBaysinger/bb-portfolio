import type { Block, GlobalConfig } from 'payload'

import { triggerFrontendProjectRevalidate } from '../utils/triggerFrontendProjectRevalidate'

const ExperienceItemBlock: Block = {
  slug: 'experienceItem',
  labels: {
    singular: 'Experience Item',
    plural: 'Experience Items',
  },
  fields: [
    {
      name: 'logo',
      label: 'Logo Upload',
      type: 'upload',
      relationTo: 'cvExperienceLogos',
      required: false,
      admin: {
        description: 'Upload/select the company logo to render for this experience item.',
      },
    },
    {
      name: 'company',
      label: 'Company',
      type: 'text',
      required: true,
    },
    {
      name: 'location',
      label: 'Location',
      type: 'text',
      required: true,
    },
    {
      name: 'title',
      label: 'Title',
      type: 'text',
      required: true,
    },
    {
      name: 'description',
      label: 'Description',
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
      label: 'Date',
      type: 'text',
      required: true,
    },
    {
      name: 'bulletPoints',
      label: 'Bullet Points',
      type: 'array',
      required: false,
      admin: {
        description:
          'Reorder these rows to change bullet order. Disable a row to hide it on the CV.',
      },
      fields: [
        {
          name: 'text',
          label: 'Text',
          type: 'text',
          required: true,
        },
        {
          name: 'enabled',
          label: 'Enabled',
          type: 'checkbox',
          defaultValue: true,
          required: true,
        },
      ],
    },
  ],
}

export const CvExperience: GlobalConfig = {
  slug: 'cvExperience',
  label: 'CV Experience',
  hooks: {
    afterChange: [
      async () => {
        await triggerFrontendProjectRevalidate('cvExperience.afterChange', {
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
      name: 'experienceItems',
      label: 'Experience Items',
      type: 'blocks',
      required: true,
      blocks: [ExperienceItemBlock],
      admin: {
        description:
          'Each row is one CV experience component. Drag and drop to control render order on the frontend.',
      },
    },
    {
      name: 'recentIndependentStudySectionHeading',
      label: 'Independent R&D / Freelance Section Heading',
      type: 'text',
      required: true,
      defaultValue: 'Independent R&D and Freelance Front-End Work',
    },
    {
      name: 'recentIndependentStudy',
      label: 'Independent R&D and Freelance',
      type: 'blocks',
      required: false,
      blocks: [ExperienceItemBlock],
      admin: {
        description:
          'Each row is one CV experience component for the Independent R&D/Freelance section. Drag and drop to control render order on the frontend.',
      },
    },
  ],
}
