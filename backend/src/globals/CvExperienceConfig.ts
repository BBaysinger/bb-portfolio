import type { GlobalConfig } from 'payload'

import { triggerFrontendProjectRevalidate } from '../utils/triggerFrontendProjectRevalidate'

import {
  DEFAULT_CV_CORE_STRENGTHS_HTML,
  DEFAULT_CV_SUMMARY_HTML,
} from './cvExperienceConfigDefaults'

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
      name: 'summaryHtml',
      label: 'Summary HTML',
      type: 'textarea',
      required: true,
      defaultValue: DEFAULT_CV_SUMMARY_HTML,
      admin: {
        rows: 8,
        description:
          'Admin-authored HTML for the CV summary section. Use semantic tags like <p>, <strong>, and <a>.',
      },
    },
    {
      name: 'coreStrengthsHtml',
      label: 'Core Strengths HTML',
      type: 'textarea',
      required: true,
      defaultValue: DEFAULT_CV_CORE_STRENGTHS_HTML,
      admin: {
        rows: 18,
        description:
          'Admin-authored HTML for the Core Strengths section. Use semantic tags like <h5>, <ul>, <li>, <strong>, and <a>.',
      },
    },
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
