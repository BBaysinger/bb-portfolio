import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import ProjectViewWrapper from "@/components/project-carousel-page/ProjectViewWrapper";
import { ProjectDataStore, projectRequiresNda } from "@/data/ProjectData";

export const revalidate = 0;
export const dynamicParams = true;
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ projectId: string }>;
}): Promise<Metadata> {
  const { projectId } = await params;
  const robots = { index: false, follow: false };

  try {
    const h = await headers();
    const cookieHeader = h.get("cookie") || "";
    const hasPayloadSession = /(?:^|;\s*)payload-token=/.test(cookieHeader);
    if (!hasPayloadSession) return { robots, title: "NDA Project" };

    const projectData = new ProjectDataStore();
    await projectData.initialize({ headers: h, disableCache: true });
    if (projectData.containsSanitizedPlaceholders)
      return { robots, title: "NDA Project" };

    const rec = projectData.getProject(projectId);
    if (!rec || !projectRequiresNda(rec))
      return { robots, title: "NDA Project" };

    return {
      robots,
      title: rec.longTitle || rec.title || "NDA Project",
    };
  } catch {
    return { robots, title: "NDA Project" };
  }
}

export default async function NdaProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  // If not authenticated, never attempt to SSR-render NDA routes.
  // This avoids backend fetch failures that can surface as a Next.js application error.
  const h = await headers();
  const cookieHeader = h.get("cookie") || "";
  const hasPayloadSession = /(?:^|;\s*)payload-token=/.test(cookieHeader);
  if (!hasPayloadSession) {
    return redirect("/");
  }

  // SSR guard: ensure this slug is truly NDA; otherwise return 404 on /nda/*.
  // We can safely fetch without cookies just to inspect the NDA flag; the public
  // API response includes `nda: true` for NDA items (and redacts details if unauthenticated).
  const projectData = new ProjectDataStore();
  // Instantiate per-request to avoid leaking NDA responses between visitors.
  // If upstream auth/cookie state is invalid (e.g., post-logout), never throw a 500 here.
  try {
    await projectData.initialize({ headers: h, disableCache: true });
  } catch {
    return redirect("/");
  }

  // Backend signaled the request lacked NDA access (placeholders were returned).
  // Treat this as unauthenticated for NDA routes and redirect to home.
  if (projectData.containsSanitizedPlaceholders) {
    return redirect("/");
  }
  const rec = projectData.getProject(projectId);
  if (!rec || !projectRequiresNda(rec)) {
    return notFound();
  }

  // If the visitor entered via the opaque short code and is authenticated,
  // canonicalize to the human-readable slug route.
  // IMPORTANT: Do NOT redirect when unauthenticated; that would leak the slug.
  const enteredViaShortCode =
    typeof rec.shortCode === "string" &&
    rec.shortCode.length > 0 &&
    projectId === rec.shortCode;
  const isAuthed = !rec.isSanitized;
  if (enteredViaShortCode && isAuthed && rec.id && rec.id !== projectId) {
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
