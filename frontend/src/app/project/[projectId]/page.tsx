import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { ProjectDataStore, projectRequiresNda } from "@/data/ProjectData";

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
  const { projectId } = await params;
  const projectData = new ProjectDataStore();

  try {
    await projectData.initialize({
      disableCache: false,
      includeNdaInActive: false,
    });
    const rec = projectData.getProject(projectId);
    // Never expose NDA project titles on the public route.
    if (rec && projectRequiresNda(rec)) {
      return { title: "Project" };
    }
    return {
      title: rec?.longTitle || rec?.title || "Project",
    };
  } catch {
    return {
      title: "Project",
    };
  }
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
  let ssrParsed:
    | import("@/data/ProjectData").ParsedPortfolioProjectData
    | undefined;
  let ssrIncludeNdaInActive: boolean | undefined;
  try {
    const projectData = new ProjectDataStore();
    await projectData.initialize({
      disableCache: false,
      includeNdaInActive: false,
    });
    const rec = projectData.getProject(projectId);
    if (!rec) return notFound();

    // NDA protection: never render/cache NDA projects on the public route.
    // Always route NDA slugs through the /nda/* pages that evaluate auth.
    if (projectRequiresNda(rec)) {
      return redirect(`/nda/${encodeURIComponent(projectId)}/`);
    }

    // Only pass the public carousel dataset snapshot to the client.
    // This avoids caching NDA rows in the ISR payload.
    const record = projectData.projectsRecord;
    ssrParsed = projectData.activeKeys.reduce(
      (acc, key) => {
        const p = record[key];
        if (p) acc[key] = p;
        return acc;
      },
      {} as import("@/data/ProjectData").ParsedPortfolioProjectData,
    );
    ssrIncludeNdaInActive = false;
  } catch {
    // no-op
  }

  return (
    <Suspense fallback={<div>Loading project...</div>}>
      <ProjectClientBoundary
        projectId={projectId}
        allowNda={false}
        ssrParsed={ssrParsed}
        ssrIncludeNdaInActive={ssrIncludeNdaInActive}
      />
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
  const projectData = new ProjectDataStore();
  try {
    await projectData.initialize({
      disableCache: false,
      includeNdaInActive: false,
    });
  } catch {
    // During some builds (e.g., CI), the backend may be unavailable.
    // Returning an empty list preserves on-demand generation via `dynamicParams`.
    return [];
  }

  return projectData.activeKeys.map((projectId) => ({ projectId }));
}
