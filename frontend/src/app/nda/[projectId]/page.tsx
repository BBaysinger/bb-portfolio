import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { ProjectDataStore, projectRequiresNda } from "@/data/ProjectData";

import NdaProjectClientBoundary from "./NdaProjectClientBoundary";

export const revalidate = 3600;
export const dynamicParams = true;
export const dynamic = "force-static";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ projectId: string }>;
}): Promise<Metadata> {
  const { projectId } = await params;
  const robots = { index: false, follow: false };

  // Never render NDA metadata from a public/SSG context.
  // The client will update document.title after auth is confirmed.
  void projectId;
  return { robots, title: "NDA Project" };
}

export default async function NdaProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  let ssrParsed:
    | import("@/data/ProjectData").ParsedPortfolioProjectData
    | undefined;

  // Prefetch sanitized placeholder dataset without cookies.
  // This is safe to cache/ISR and gives an instant carousel with locked placeholders.
  try {
    const projectData = new ProjectDataStore();
    await projectData.initialize({
      disableCache: false,
      includeNdaInActive: true,
    });
    const rec = projectData.getProject(projectId);
    if (!rec) return notFound();
    if (!projectRequiresNda(rec)) {
      // Canonical per project: public slugs should live under /project.
      return redirect(`/project/${encodeURIComponent(projectId)}/`);
    }
    ssrParsed = projectData.projectsRecord;
  } catch {
    // Fall back to client fetch if backend is unavailable
  }

  return (
    <Suspense fallback={<div>Loading NDA project...</div>}>
      <NdaProjectClientBoundary
        projectId={projectId}
        ssrParsed={ssrParsed}
        ssrIncludeNdaInActive={true}
      />
    </Suspense>
  );
}

export async function generateStaticParams() {
  return [];
}
