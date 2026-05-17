import type { GlobalConfig } from 'payload'

import { triggerFrontendCvRevalidate } from '../utils/triggerFrontendCvRevalidate'

import {
  CV_CORE_STRENGTHS_HTML_SEED,
  CV_EXPERIENCE_SECTION_HEADING_SEED,
  CV_RECENT_INDEPENDENT_STUDY_SECTION_HEADING_SEED,
  CV_SUMMARY_HTML_SEED,
} from './cvExperienceConfigSeed'

export const CvExperienceConfig: GlobalConfig = {
  slug: 'cvExperienceConfig',
  label: 'CV Experience Config',
  hooks: {
    afterChange: [
      async () => {
        await triggerFrontendCvRevalidate('cvExperienceConfig.afterChange', {
          warmPaths: ['/cv'],
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
      defaultValue: CV_SUMMARY_HTML_SEED,
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
      defaultValue: CV_CORE_STRENGTHS_HTML_SEED,
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
      defaultValue: CV_EXPERIENCE_SECTION_HEADING_SEED,
    },
    {
      name: 'recentIndependentStudySectionHeading',
      label: 'Independent R&D / Freelance Section Heading',
      type: 'text',
      required: true,
      defaultValue: CV_RECENT_INDEPENDENT_STUDY_SECTION_HEADING_SEED,
    },
  ],
}

export default CvExperienceConfig
