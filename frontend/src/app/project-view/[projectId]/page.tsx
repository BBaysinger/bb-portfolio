import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import ProjectViewWrapper from "@/components/project-carousel-page/ProjectViewWrapper";
import ProjectData from "@/data/ProjectData";
// Auth helper is imported only when needed (NDA branch) to keep SSG graph lean

export const runtime = "nodejs";
// We statically generate all public project routes; disallow dynamic params at runtime
export const dynamicParams = false;

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

  // Ensure data is initialized before accessing active/public records
  await ProjectData.initialize();

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
  const allProjects = ProjectData["_projects"];
  const project = allProjects[projectId];
  if (project && project.nda) {
    // Check authentication (SSR)
    const cookieStore = await cookies();
    const token = cookieStore.get("authToken")?.value;
    let isAuthenticated = false;
    if (token) {
      const { verifyAuthToken } = await import("@/utils/authHelpers");
      isAuthenticated = await verifyAuthToken(token);
    }
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
  try {
    // Initialize project data from backend API
    await ProjectData.initialize();
    const projectIds = Object.keys(ProjectData.activeProjectsRecord);

    console.log(
      `📄 [generateStaticParams] Generated static params for ${projectIds.length} projects`,
    );

    return projectIds.map((projectId) => ({
      projectId,
    }));
  } catch (error) {
    // Backend not accessible - fall back to on-demand page generation
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.warn(
      `⚠️  [generateStaticParams] Backend not accessible (${errorMessage}) - falling back to on-demand page generation`,
    );
    return [];
  }
}
