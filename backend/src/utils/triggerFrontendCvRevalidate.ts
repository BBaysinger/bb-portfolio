import { createFrontendRevalidateTrigger } from './frontendRevalidate'

// CV experience content. Prefers its own explicit URL/secret, falling back to the
// shared FRONTEND_PROJECTS_* env vars (see frontendRevalidate.ts).
export const triggerFrontendCvRevalidate = createFrontendRevalidateTrigger({
  label: 'CV',
  path: '/api/revalidate/cv',
  explicitUrlEnv: 'FRONTEND_CV_REVALIDATE_URL',
  secretEnv: 'FRONTEND_CV_REVALIDATE_SECRET',
})
