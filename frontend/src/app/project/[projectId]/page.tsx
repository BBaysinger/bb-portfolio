/**
 * Public project detail route: `/project/[projectId]`.
 *
 * This page is rendered as SSG/ISR and delegates data fetching + title updates to the client
 * boundary, keeping server-side metadata generation cache-safe.
 *
 * Key exports:
 * - `revalidate` / `dynamicParams` to control ISR behavior.
 * - `generateMetadata` for a safe default title.
 * - Default export `ProjectPage`.
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { buildPageMetadata, buildProjectPageTitle } from "@/app/siteMetadata";
import { ProjectDataStore } from "@/data/ProjectData";

import ProjectClientBoundary from "./ProjectClientBoundary";

const shouldFailFastProjectSsg = (): boolean => {
  return process.env.PROJECT_SSG_FAIL_FAST !== "0";
};

// Allow SSG/ISR for the project detail route.
// NOTE: `revalidate = 0` would make this route dynamic/no-store.
export const revalidate = 86400;
// Pre-render known params at build time.
export const dynamicParams = true;
export const dynamic = "force-static";

/**
 * Provides metadata for the public project route.
 *
 * Keep metadata cache-safe: do not fetch from the backend here.
 * The client sets `document.title` from the hydrated project store.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ projectId: string }>;
}): Promise<Metadata> {
  const { projectId } = await params;

  let title = buildProjectPageTitle();

  try {
    const projectData = new ProjectDataStore();
    await projectData.initialize({
      disableCache: false,
      includeNdaInActive: false,
    });

    title = buildProjectPageTitle(projectData.getProject(projectId));
  } catch {
    // Fall back to the generic project section title when prefetch fails.
  }

  return buildPageMetadata({
    title,
    path: `/project/${encodeURIComponent(projectId)}/`,
  });
}

/**
 * Server component wrapper for the project detail page.
 *
 * Renders a suspense boundary around `ProjectClientBoundary`, which handles client-side fetching
 * and any in-app navigation behavior.
 *
 * @param params - Next.js dynamic route params.
 */
export default async function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const failFast = shouldFailFastProjectSsg();

  let ssrParsed:
    | import("@/data/ProjectData").ParsedPortfolioProjectData
    | undefined;

  try {
    const projectData = new ProjectDataStore();
    await projectData.initialize({
      disableCache: false,
      includeNdaInActive: false,
    });

    const rec = projectData.getProject(projectId);
    if (!rec) return notFound();

    ssrParsed = projectData.projectsRecord;
  } catch (error) {
    if (failFast) throw error;
    if (process.env.NODE_ENV !== "production") {
      console.error("Failed to SSR prefetch public projects", error);
    }
  }

  return (
    <Suspense fallback={<div>Loading project...</div>}>
      <ProjectClientBoundary
        projectId={projectId}
        allowNda={false}
        ssrParsed={ssrParsed}
        ssrIncludeNdaInActive={false}
      />
    </Suspense>
  );
}

/**
 * Static params for build-time pre-rendering.
 *
 * Build-time static params for full SSG.
 */
export async function generateStaticParams() {
  const failFast = shouldFailFastProjectSsg();
  const projectData = new ProjectDataStore();

  try {
    await projectData.initialize({
      disableCache: false,
      includeNdaInActive: false,
    });
  } catch (error) {
    if (failFast) throw error;
    if (process.env.NODE_ENV !== "production") {
      console.error("Failed to generate public project static params", error);
    }
    return [];
  }

  const uniqueIds = Array.from(new Set(projectData.activeKeys)).filter(
    (id): id is string => Boolean(id),
  );

  if (uniqueIds.length === 0) {
    if (failFast) {
      throw new Error(
        "SSG parameter generation produced zero public project IDs.",
      );
    }
    return [];
  }

  return uniqueIds.map((projectId) => ({ projectId }));
}
