import { Suspense } from "react";

import ProjectViewWrapper from "@/components/project-carousel-page/ProjectViewWrapper";

// Static, no ISR and no segment normalization refreshes.
export const revalidate = 0;
// Allow on-demand generation for unknown params if desired; disable if you want strict static.
export const dynamicParams = true;

/**
 * Renders the project view page using a suspense-wrapped client-side component.
 * Validates the projectId param server-side on initial load.
 *
 * This page does not re-render on client-side route changes,
 * which are handled by ProjectViewWrapper via `window.history.pushState()`
 * and a custom useRouteChange hook.
 *
 * @param {Object} params - The dynamic route params.
 * @param {string} params.projectId - The project identifier from the route.
 * @returns A React suspense boundary that wraps ProjectViewWrapper,
 *          or a 404 if the project ID is invalid.
 */
export default function ProjectPage({
  params,
}: {
  params: { projectId: string };
}) {
  const { projectId } = params;
  return (
    <Suspense fallback={<div>Loading project...</div>}>
      <ProjectViewWrapper params={{ projectId }} allowNda={false} />
    </Suspense>
  );
}

/**
 * Generates the list of projectId params for static generation.
 * Used by Next.js during pre-rendering to build all project pages.
 *
 * @returns An array of projectId param objects.
 */
// Optional: pre-render known public project IDs at build time.
// If you prefer purely on-demand rendering, you can remove this.
export async function generateStaticParams() {
  return [];
}
