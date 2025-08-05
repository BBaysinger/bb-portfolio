import { notFound } from "next/navigation";
import { Suspense } from "react";

import ProjectViewWrapper from "@/components/project-carousel-page/ProjectViewWrapper";
import ProjectData from "@/data/ProjectData";

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

  if (!projectId || !ProjectData.activeProjectsRecord[projectId]) {
    return notFound();
  }

  return (
    <Suspense fallback={<div>Loading project...</div>}>
      <ProjectViewWrapper params={{ projectId }} />
    </Suspense>
  );
}

/**
 * Generates the list of projectId params for static generation.
 * Used by Next.js during pre-rendering to build all project pages.
 *
 * @returns An array of projectId param objects.
 */
export async function generateStaticParams() {
  return Object.keys(ProjectData.activeProjectsRecord).map((projectId) => ({
    projectId,
  }));
}
