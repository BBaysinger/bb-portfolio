import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { ProjectDataStore } from "@/data/ProjectData";

import NdaIncludedProjectClientBoundary from "./NdaIncludedProjectClientBoundary";

/**
 * NDA-included project route.
 *
 * This is the "NDA included" carousel route: it can render a stable slide list that
 * includes NDA placeholders without requiring auth at build/request time.
 *
 * Security invariant: confidential NDA fields are never rendered server-side in this route.
 * Authenticated details are fetched client-side after login.
 */
export const revalidate = 3600;
export const dynamicParams = true;
export const dynamic = "force-static";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ projectId: string }>;
}): Promise<Metadata> {
  const { projectId: _projectId } = await params;
  const robots = { index: false, follow: false };
  void _projectId;
  return { robots, title: "Project" };
}

export default async function NdaIncludedProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

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
  return [];
}
