import path from 'path'
import { fileURLToPath } from 'url'

import { readYamlFile } from '../../scripts/lib/portfolio-content'

type CvExperienceConfigSeedFile = {
  summaryHtml?: unknown
  coreStrengthsHtml?: unknown
  experienceSectionHeading?: unknown
  recentIndependentStudySectionHeading?: unknown
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const seedPath = path.resolve(__dirname, '../../scripts/seed-assets/cv-experience-config.yaml')
const seedFile = readYamlFile<CvExperienceConfigSeedFile>(seedPath)

const asNonEmptyString = (value: unknown, fieldName: string) => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Expected ${fieldName} to be a non-empty string in ${seedPath}`)
  }

  return value.trim()
}

export const CV_SUMMARY_HTML_SEED = asNonEmptyString(seedFile.summaryHtml, 'summaryHtml')

export const CV_CORE_STRENGTHS_HTML_SEED = asNonEmptyString(
  seedFile.coreStrengthsHtml,
  'coreStrengthsHtml',
)

export const CV_EXPERIENCE_SECTION_HEADING_SEED = asNonEmptyString(
  seedFile.experienceSectionHeading,
  'experienceSectionHeading',
)

export const CV_RECENT_INDEPENDENT_STUDY_SECTION_HEADING_SEED = asNonEmptyString(
  seedFile.recentIndependentStudySectionHeading,
  'recentIndependentStudySectionHeading',
)
