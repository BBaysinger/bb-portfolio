import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import ProjectViewWrapper from "@/components/project-carousel-page/ProjectViewWrapper";
import ProjectData from "@/data/ProjectData";
import { verifyAuthToken } from "@/utils/authHelpers"; // You may need to implement this helper

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

  // Try to get the project from the active (public) record first
  const publicProject = ProjectData.activeProjectsRecord[projectId];
  if (publicProject) {
    return (
      <Suspense fallback={<div>Loading project...</div>}>
        <ProjectViewWrapper params={{ projectId }} />
      </Suspense>
    );
  }

  // If not public, check if it's NDA and SSR is allowed for logged-in users
  const allProjects = await (async () => {
    if (
      !ProjectData["_projects"] ||
      Object.keys(ProjectData["_projects"]).length === 0
    ) {
      await ProjectData.initialize();
    }
    return ProjectData["_projects"];
  })();
  const project = allProjects[projectId];
  if (project && project.nda) {
    // Check authentication (SSR)
    const cookieStore = await cookies();
    const token = cookieStore.get("authToken")?.value;
    const isAuthenticated = token ? await verifyAuthToken(token) : false;
    if (isAuthenticated) {
      return (
        <Suspense fallback={<div>Loading NDA project...</div>}>
          <ProjectViewWrapper params={{ projectId }} />
        </Suspense>
      );
    }
    // Not authenticated, show 404 or access denied
    return notFound();
  }

  // Not found
  return notFound();
}

/**
 * Generates the list of projectId params for static generation.
 * Used by Next.js during pre-rendering to build all project pages.
 *
 * @returns An array of projectId param objects.
 */
export async function generateStaticParams() {
  // Only generate static params for public (non-NDA) projects
  return Object.keys(ProjectData.activeProjectsRecord).map((projectId) => ({
    projectId,
  }));
}
