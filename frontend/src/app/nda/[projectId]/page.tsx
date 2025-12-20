import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import ProjectViewWrapper from "@/components/project-carousel-page/ProjectViewWrapper";
import { ProjectDataStore, projectRequiresNda } from "@/data/ProjectData";

export const revalidate = 0;
export const dynamicParams = true;
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function NdaProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  // SSR guard: ensure this slug is truly NDA; otherwise return 404 on /nda/*.
  // We can safely fetch without cookies just to inspect the NDA flag; the public
  // API response includes `nda: true` for NDA items (and redacts details if unauthenticated).
  const h = await headers();
  const projectData = new ProjectDataStore();
  // Instantiate per-request to avoid leaking NDA responses between visitors.
  await projectData.initialize({ headers: h, disableCache: true });
  const rec = projectData.getProject(projectId);
  if (!rec || !projectRequiresNda(rec)) {
    return notFound();
  }

  // If the visitor entered via UUID and is authenticated (i.e., NDA is not sanitized),
  // canonicalize to the human-readable slug route.
  // IMPORTANT: Do NOT redirect when unauthenticated; that would leak the slug.
  const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const isUuid = UUID_RE.test(projectId);
  const isAuthed = !rec.isSanitized;
  if (isUuid && isAuthed && rec.id && rec.id !== projectId) {
    return redirect(`/nda/${encodeURIComponent(rec.id)}/`);
  }

  return (
    <Suspense fallback={<div>Loading NDA project...</div>}>
      <ProjectViewWrapper params={{ projectId }} allowNda={true} />
    </Suspense>
  );
}

export async function generateStaticParams() {
  return [];
}
