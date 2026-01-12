import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { ProjectDataStore, projectRequiresNda } from "@/data/ProjectData";

import NdaProjectClientBoundary from "./NdaProjectClientBoundary";
export const revalidate = 3600;
export const dynamicParams = true;
export const dynamic = "force-static";

// NOTE (INTENTIONAL): this route is SSG/ISR so we can render a stable carousel + NDA placeholders
// without requiring auth at build/request time. Confidential NDA fields are *not* rendered here;
// authenticated details are fetched client-side after login.

export async function generateMetadata({
  params,
}: {
  params: Promise<{ projectId: string }>;
}): Promise<Metadata> {
  const { projectId } = await params;
  const robots = { index: false, follow: false };

  // Never render NDA metadata from a public/SSG context.
  // Client updates document.title after auth load.
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
  let ssrContainsSanitizedPlaceholders: boolean | undefined;

  // Prefetch an unauthenticated dataset that includes NDA placeholders in the active set.
  // This is safe to cache (ISR) and gives a stable slide list immediately.
  try {
    const projectData = new ProjectDataStore();
    const initResult = await projectData.initialize({
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
    // IMPORTANT: plumb placeholder/sanitization metadata through SSR -> CSR hydration.
    // Without this, the client cannot reliably detect that it needs to refetch after login.
    ssrContainsSanitizedPlaceholders = Boolean(
      initResult?.containsSanitizedPlaceholders,
    );
  } catch {
    // Fall back to client fetch if backend is unavailable
  }

  return (
    <Suspense fallback={<div>Loading NDA project...</div>}>
      <NdaProjectClientBoundary
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
