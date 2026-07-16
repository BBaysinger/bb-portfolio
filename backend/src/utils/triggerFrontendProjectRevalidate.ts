import {
  createFrontendRevalidateTrigger,
  createScheduledFrontendRevalidateTrigger,
} from './frontendRevalidate'

// Project / branding / greeting content. Uses the shared frontend revalidation secret.
export const triggerFrontendProjectRevalidate = createFrontendRevalidateTrigger({
  label: 'project',
  path: '/api/revalidate/projects',
  explicitUrlEnv: 'FRONTEND_PROJECTS_REVALIDATE_URL',
  secretEnv: 'FRONTEND_REVALIDATE_SECRET',
})

export const scheduleFrontendProjectRevalidate = createScheduledFrontendRevalidateTrigger(
  triggerFrontendProjectRevalidate,
)
