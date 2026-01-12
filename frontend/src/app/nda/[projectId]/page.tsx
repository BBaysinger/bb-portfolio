import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { ProjectDataStore, projectRequiresNda } from "@/data/ProjectData";

import NdaProjectClientBoundary from "./NdaProjectClientBoundary";

/**
 * NDA project route.
 *
 * This page intentionally uses SSG/ISR so we can render a stable carousel and NDA placeholders
 * without requiring auth at build/request time.
 *
 * Security invariant: confidential NDA fields are never rendered server-side in this route.
 * Authenticated details are fetched client-side after login.
 */
export const revalidate = 3600;
export const dynamicParams = true;
export const dynamic = "force-static";

/**
 * Provides metadata for the NDA project route.
 *
 * IMPORTANT: Metadata must not reveal NDA details from a public/SSG context.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ projectId: string }>;
}): Promise<Metadata> {
  const { projectId: _projectId } = await params;
  const robots = { index: false, follow: false };

  // Never render NDA metadata from a public/SSG context.
  // Client updates document.title after auth load.
  void _projectId;
  return { robots, title: "NDA Project" };
}

/**
 * Server component wrapper for NDA project pages.
 *
 * Prefetches an unauthenticated dataset that includes NDA placeholders so the carousel/slide list
 * is stable on first render; the client boundary then refetches authenticated details after login.
 */
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
  } catch (error) {
    // Fall back to client fetch if backend is unavailable.
    // Log in non-production to avoid silent failures during local/dev.
    if (process.env.NODE_ENV !== "production") {
      console.error("Failed to SSR prefetch NDA placeholders", error);
    }
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

/**
 * This route is intentionally not statically enumerated.
 *
 * We allow on-demand generation (ISR) based on the URL param.
 */
export async function generateStaticParams() {
  return [];
}
