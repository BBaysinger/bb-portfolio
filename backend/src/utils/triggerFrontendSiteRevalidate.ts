import {
  createFrontendRevalidateTrigger,
  createScheduledFrontendRevalidateTrigger,
} from './frontendRevalidate'

// Whole-site content. Prefers its own explicit URL/secret, falling back to the
// shared FRONTEND_PROJECTS_* env vars (see frontendRevalidate.ts).
export const triggerFrontendSiteRevalidate = createFrontendRevalidateTrigger({
  label: 'site',
  path: '/api/revalidate/site',
  explicitUrlEnv: 'FRONTEND_SITE_REVALIDATE_URL',
  secretEnv: 'FRONTEND_REVALIDATE_SECRET',
})

export const scheduleFrontendSiteRevalidate = createScheduledFrontendRevalidateTrigger(
  triggerFrontendSiteRevalidate,
)
