import {
  createFrontendRevalidateTrigger,
  createScheduledFrontendRevalidateTrigger,
} from './frontendRevalidate'

// Project / branding / greeting content. Uses the shared FRONTEND_PROJECTS_* env
// vars as both its primary and fallback source (see frontendRevalidate.ts).
export const triggerFrontendProjectRevalidate = createFrontendRevalidateTrigger({
  label: 'project',
  path: '/api/revalidate/projects',
  explicitUrlEnv: 'FRONTEND_PROJECTS_REVALIDATE_URL',
  secretEnv: 'FRONTEND_PROJECTS_REVALIDATE_SECRET',
})

export const scheduleFrontendProjectRevalidate = createScheduledFrontendRevalidateTrigger(
  triggerFrontendProjectRevalidate,
)
