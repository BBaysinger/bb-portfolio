// Temporary redirect: forward basePath root (/admin/) to the generated
// admin UI at /admin/admin/. This is a short-term hotfix so the admin
// is reachable immediately while we resolve the generated-route layout.
import { redirect } from 'next/navigation'

export const revalidate = 0

export default function Page() {
  // Absolute path: ensure the browser lands on the admin UI pages.
  redirect('/admin/admin/')
}
