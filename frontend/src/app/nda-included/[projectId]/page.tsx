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
 * Security invariant: confidential NDA fields are never rendered in this route.
 */
export const revalidate = 3600;
export const dynamicParams = false;
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

  const projectData = new ProjectDataStore();
  const initResult = await projectData.initialize({
    disableCache: false,
    includeNdaInActive: true,
  });

  const rec = projectData.getProject(projectId);
  if (!rec) return notFound();

  const ssrParsed = projectData.projectsRecord;
  const ssrContainsSanitizedPlaceholders = Boolean(
    initResult?.containsSanitizedPlaceholders,
  );

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
  const projectData = new ProjectDataStore();
  await projectData.initialize({
    disableCache: false,
    includeNdaInActive: true,
  });

  const uniqueIds = Array.from(
    new Set(projectData.activeProjects.map((project) => project.id)),
  ).filter((id): id is string => Boolean(id));

  if (uniqueIds.length === 0) {
    throw new Error(
      "SSG parameter generation produced zero NDA-included project IDs.",
    );
  }

  return uniqueIds.map((projectId) => ({ projectId }));
}
