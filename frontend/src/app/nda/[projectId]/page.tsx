import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import ProjectViewWrapper from "@/components/project-carousel-page/ProjectViewWrapper";
import ProjectData from "@/data/ProjectData";

export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // NDA pages must be rendered on each request
export const revalidate = 0; // disable ISR caching for NDA content
export const dynamicParams = true;

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function NdaProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  // Gather incoming request headers and cookies
  const incoming = await headers();
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");
  const forwardedHeaders: HeadersInit = (() => {
    const h = new Headers(Object.fromEntries(incoming.entries()));
    if (cookieHeader) h.set("cookie", cookieHeader);
    return h;
  })();

  // Determine SSR auth state against backend directly
  let isAuthenticated = false;
  try {
    const env = (
      process.env.ENV_PROFILE ||
      process.env.NODE_ENV ||
      ""
    ).toLowerCase();
    const prefix = env ? `${env.toUpperCase()}_` : "";
    const pick = (...names: string[]) => {
      for (const n of names) {
        const v = process.env[n];
        if (v) return v;
      }
      return "";
    };
    const base =
      pick(
        `${prefix}BACKEND_INTERNAL_URL`,
        `${prefix}NEXT_PUBLIC_BACKEND_URL`,
      ) ||
      process.env.NEXT_PUBLIC_BACKEND_URL ||
      "http://localhost:8081";
    const backend = base.replace(/\/$/, "");

    const tryFetch = async (url: string) =>
      fetch(url, {
        method: "GET",
        headers: {
          ...(cookieHeader && { Cookie: cookieHeader }),
          Accept: "application/json",
        },
        cache: "no-store",
      });

    let res = await tryFetch(`${backend}/api/users/me`);
    if (!res.ok && res.status === 401) {
      res = await tryFetch(`${backend}/api/users/me/`);
    }
    isAuthenticated = res.ok;
  } catch {
    isAuthenticated = false;
  }

  // Initialize data with NDA allowed when authenticated
  try {
    await ProjectData.initialize({
      headers: forwardedHeaders,
      disableCache: true,
      includeNdaInActive: isAuthenticated,
    });
  } catch {
    // Avoid leaking existence of NDA slugs
    return notFound();
  }

  const allProjects = (
    ProjectData as unknown as {
      _projects: import("@/data/ProjectData").ParsedPortfolioProjectData;
    }
  )["_projects"];
  const project = allProjects[projectId];

  // Only serve NDA projects here; public projects should use /project/[id]
  if (!project || !project.nda) {
    return notFound();
  }

  // Require authentication for NDA pages
  if (!isAuthenticated) {
    return notFound(); // or redirect('/login?next=...') if you prefer
  }

  return (
    <Suspense fallback={<div>Loading NDA project...</div>}>
      <ProjectViewWrapper
        params={{ projectId }}
        isAuthenticated={true}
        allowNda={true}
        ssrParsed={allProjects}
        ssrIncludeNdaInActive={true}
      />
    </Suspense>
  );
}

export async function generateStaticParams() {
  // NDA pages are not pre-rendered; render only on-demand
  return [];
}
