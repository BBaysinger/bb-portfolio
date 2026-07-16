import {
  createFrontendRevalidateTrigger,
  createScheduledFrontendRevalidateTrigger,
} from './frontendRevalidate'

// CV experience content. Uses the shared frontend revalidation secret.
export const triggerFrontendCvRevalidate = createFrontendRevalidateTrigger({
  label: 'CV',
  path: '/api/revalidate/cv',
  explicitUrlEnv: 'FRONTEND_CV_REVALIDATE_URL',
  secretEnv: 'FRONTEND_REVALIDATE_SECRET',
})

export const scheduleFrontendCvRevalidate = createScheduledFrontendRevalidateTrigger(
  triggerFrontendCvRevalidate,
)
