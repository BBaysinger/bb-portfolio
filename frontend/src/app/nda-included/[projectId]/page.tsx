import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { buildPageMetadata, buildProjectPageTitle } from "@/app/siteMetadata";
import { ProjectDataStore } from "@/data/ProjectData";

import NdaIncludedProjectClientBoundary from "./NdaIncludedProjectClientBoundary";

const shouldFailFastProjectSsg = (): boolean => {
  return process.env.PROJECT_SSG_FAIL_FAST !== "0";
};

const shouldFailFastProjectRuntime = (): boolean => false;

/**
 * NDA-included project route.
 *
 * This is the "NDA included" carousel route: it can render a stable slide list that
 * includes NDA placeholders without requiring auth at build/request time.
 *
 * Security invariant: confidential NDA fields are never rendered in this route.
 */
export const revalidate = 86400;
export const dynamicParams = true;
export const dynamic = "force-static";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ projectId: string }>;
}): Promise<Metadata> {
  const { projectId } = await params;
  const robots = { index: false, follow: false };

  let title = buildProjectPageTitle();

  try {
    const projectData = new ProjectDataStore();
    await projectData.initialize({
      disableCache: false,
      includeNdaInActive: true,
    });

    title = buildProjectPageTitle(projectData.getProject(projectId));
  } catch {
    // Fall back to the generic project section title when prefetch fails.
  }

  return buildPageMetadata({
    title,
    path: `/nda-included/${encodeURIComponent(projectId)}/`,
    robots,
  });
}

export default async function NdaIncludedProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const failFast = shouldFailFastProjectRuntime();

  let ssrParsed:
    | import("@/data/ProjectData").ParsedPortfolioProjectData
    | undefined;
  let ssrContainsSanitizedPlaceholders: boolean | undefined;

  try {
    const projectData = new ProjectDataStore();
    const initResult = await projectData.initialize({
      disableCache: false,
      includeNdaInActive: true,
    });

    const rec = projectData.getProject(projectId);
    if (!rec) return notFound();

    ssrParsed = projectData.projectsRecord;
    ssrContainsSanitizedPlaceholders = Boolean(
      initResult?.containsSanitizedPlaceholders,
    );
  } catch (error) {
    if (failFast) throw error;
    if (process.env.NODE_ENV !== "production") {
      console.error("Failed to SSR prefetch NDA-included placeholders", error);
    }
  }

  return (
    <Suspense fallback={<div>Loading project...</div>}>
      <NdaIncludedProjectClientBoundary
        projectId={projectId}
        ssrParsed={ssrParsed}
        ssrIncludeNdaInActive={true}
        ssrContainsSanitizedPlaceholders={ssrContainsSanitizedPlaceholders}
      />
    </Suspense>
  );
}

export async function generateStaticParams() {
  const failFast = shouldFailFastProjectSsg();
  const projectData = new ProjectDataStore();

  try {
    await projectData.initialize({
      disableCache: false,
      includeNdaInActive: true,
    });
  } catch (error) {
    if (failFast) throw error;
    if (process.env.NODE_ENV !== "production") {
      console.error("Failed to generate NDA project static params", error);
    }
    return [];
  }

  const staticRouteKeys = new Set<string>();
  for (const project of projectData.activeProjects) {
    if (project.id) staticRouteKeys.add(project.id);
    const shortCode = project.shortCode?.trim();
    if (shortCode) staticRouteKeys.add(shortCode);
  }
  const uniqueIds = Array.from(staticRouteKeys);

  if (uniqueIds.length === 0) {
    if (failFast) {
      throw new Error(
        "SSG parameter generation produced zero NDA-included project IDs.",
      );
    }
    return [];
  }

  return uniqueIds.map((projectId) => ({ projectId }));
}
