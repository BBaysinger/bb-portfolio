import { cookies, headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
// import { Suspense } from "react";

import ProjectData from "@/data/ProjectData";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Legacy query-param entry point: `/project?p=slug`.
 * Now used only to canonicalize direct hits to the segment route or return 404.
 * In-session navigation still manipulates `?p=` client-side without hitting this.
 */
export default async function ProjectQueryPage({
  searchParams,
}: {
  // Next.js dynamic APIs require awaiting searchParams in server components.
  // Conform to Next.js expected type: promise form only.
  searchParams?: Promise<{ p?: string | string[] }>;
}) {
  const sp = (await searchParams) ?? {};
  const param = (sp as { p?: string | string[] }).p;
  const p = Array.isArray(param) ? param[0] : param;
  const projectIdRaw = typeof p === "string" ? p : "";
  const projectId = projectIdRaw.replace(/\/+$/u, "");

  if (!projectId) return notFound();

  // Prepare cookies for backend calls
  const _incoming = await headers();
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");
  const cookieOnlyHeaders: HeadersInit = (() => {
    const h = new Headers();
    if (cookieHeader) h.set("cookie", cookieHeader);
    return h;
  })();

  // Determine SSR auth state to decide NDA handling
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
    const normalizedProfile = env.startsWith("prod")
      ? "prod"
      : env === "development" || env.startsWith("dev")
        ? "dev"
        : env.startsWith("local")
          ? "local"
          : env;
    const base =
      pick(`${prefix}BACKEND_INTERNAL_URL`) ||
      (() => {
        if (normalizedProfile === "dev")
          return "http://bb-portfolio-backend-dev:3000";
        if (normalizedProfile === "prod")
          return "http://bb-portfolio-backend-prod:3000";
        if (normalizedProfile === "local")
          return "http://bb-portfolio-backend-local:3001";
        return "http://localhost:8081";
      })();
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

  // Initialize project data without NDA in the active set for public route
  try {
    await ProjectData.initialize({
      headers: cookieOnlyHeaders,
      disableCache: true,
      includeNdaInActive: false,
    });
  } catch {
    return notFound();
  }

  // Check existence in public active set
  const publicProject =
    ProjectData.activeProjectsRecord[projectId] ||
    ProjectData.activeProjectsRecord[projectId.replace(/\/+$/u, "")];
  if (publicProject) {
    // Canonicalize direct entries on the query route to the segment route.
    // In-session client-side navigation will still use ?p= via history.pushState
    // without triggering a server redirect.
    return redirect(`/project/${encodeURIComponent(projectId)}`);
  }

  // Else, check if NDA and user is authenticated
  const allProjects = (
    ProjectData as unknown as {
      _projects: import("@/data/ProjectData").ParsedPortfolioProjectData;
    }
  )["_projects"];
  const project = allProjects[projectId] || allProjects[projectIdRaw];
  if (project && project.nda) {
    if (isAuthenticated) {
      // For now, keep NDA on the segment route
      redirect(`/nda/${encodeURIComponent(projectId)}`);
    }
    return notFound();
  }

  return notFound();
}
