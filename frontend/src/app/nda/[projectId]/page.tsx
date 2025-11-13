import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import ProjectViewWrapper from "@/components/project-carousel-page/ProjectViewWrapper";

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
  // Importing ProjectData here ensures server-side initialization is scoped per request.
  const { default: ProjectData } = await import("@/data/ProjectData");
  const headerObj = Object.fromEntries(h.entries());
  await ProjectData.initialize({ headers: headerObj, disableCache: true });
  const rec = ProjectData.getProject(projectId);
  if (!rec || !rec.nda) {
    return notFound();
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
