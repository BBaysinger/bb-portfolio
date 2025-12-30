import type { Metadata } from "next";
import { Suspense } from "react";

import ProjectClientBoundary from "./ProjectClientBoundary";

// Allow SSG/ISR for the project detail route.
// NOTE: `revalidate = 0` would make this route dynamic/no-store.
export const revalidate = 3600;
// Allow on-demand generation for unknown params if needed.
export const dynamicParams = true;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ projectId: string }>;
}): Promise<Metadata> {
  // Keep metadata fast and cache-safe: do not fetch from the backend here.
  // The client sets document.title from the hydrated ProjectData store.
  void (await params);
  return { title: "Project" };
}

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
export default async function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return (
    <Suspense fallback={<div>Loading project...</div>}>
      <ProjectClientBoundary projectId={projectId} allowNda={false} />
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
  // Avoid build-time backend dependency; allow on-demand generation.
  return [];
}
