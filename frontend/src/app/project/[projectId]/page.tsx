import { cookies, headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import ProjectViewWrapper from "@/components/project-carousel-page/ProjectViewWrapper";
import ProjectData from "@/data/ProjectData";
// import styles from "@/styles/ProjectPage.module.css";

export const runtime = "nodejs";
// Using headers()/cookies() makes this page dynamic at request time
export const dynamic = "force-dynamic";
// Prefer SSG for known routes, but allow on-demand generation for any valid projectId at runtime
export const dynamicParams = true;

/**
 * Renders the project view page using a suspense-wrapped client-side component.
 * Validates the projectId param server-side on initial load.
 *
 * This page does not re-render on client-side route changes,
 * which are handled by ProjectViewWrapper via `window.history.pushState()`
 * and a custom useRouteChange hook.
 *
 * @param {Object} params - The dynamic route params.
 * @param {string} params.projectId - The project identifier from the route.
 * @returns A React suspense boundary that wraps ProjectViewWrapper,
 *          or a 404 if the project ID is invalid.
 */
export default async function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  // Forward the incoming request headers (Host, X-Forwarded-*) so we can
  // reliably construct absolute same-origin URLs for server-side fetches.
  // This ensures Next.js rewrites handle cookie forwarding to the backend.
  const incoming = await headers();
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");
  const forwardedHeaders: HeadersInit = (() => {
    // Clone all request headers, then explicitly apply Cookie from cookieStore
    // (headers() may redact or omit it depending on config).
    // Convert ReadonlyHeaders to a plain Headers instance
    const h = new Headers(Object.fromEntries(incoming.entries()));
    if (cookieHeader) h.set("cookie", cookieHeader);
    return h;
  })();

  // Determine SSR auth state first
  let isAuthenticated = false;
  try {
    // Resolve backend URL similar to ProjectData logic
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

  // Debug logging to help diagnose 404s in dev
  if (process.env.NODE_ENV !== "production") {
    console.info("[project] SSR auth:", {
      projectId,
      isAuthenticated,
      cookiePresent: Boolean(cookieHeader),
    });
  }

  // Ensure data is initialized before accessing records
  try {
    await ProjectData.initialize({
      headers: forwardedHeaders,
      disableCache: true,
      // Public route: never include NDA projects in the active set
      includeNdaInActive: false,
    });
  } catch (err) {
    // Avoid a hard 500 from upstream flakiness; degrade gracefully
    if (process.env.NODE_ENV !== "production") {
      console.error("[project] initialize failed", err);
    }
    return notFound();
  }

  // Try to get the project from the active (public) record first
  const publicProject = ProjectData.activeProjectsRecord[projectId];
  if (publicProject) {
    if (process.env.NODE_ENV !== "production") {
      console.info(
        "[project] Project found in activeProjectsRecord:",
        projectId,
      );
    }
    return (
      <Suspense fallback={<div>Loading project...</div>}>
        <ProjectViewWrapper
          params={{ projectId }}
          isAuthenticated={isAuthenticated}
          allowNda={false}
        />
      </Suspense>
    );
  }

  // If not public, check if it's NDA and SSR is allowed for logged-in users
  const allProjects = ProjectData["_projects"];
  const project = allProjects[projectId];
  if (project && project.nda) {
    if (process.env.NODE_ENV !== "production") {
      console.info("[project] NDA project detected:", projectId, {
        authed: isAuthenticated,
      });
    }
    if (isAuthenticated) {
      // Authenticated users should view NDA projects under the /nda route
      redirect(`/nda/${projectId}`);
    }
    // Not authenticated, show 404 or access denied
    return notFound();
  }

  // Not found
  if (process.env.NODE_ENV !== "production") {
    console.warn("[project] Project not found in data:", projectId, {
      keysSample: Object.keys(allProjects).slice(0, 5),
      total: Object.keys(allProjects).length,
    });
  }
  return notFound();
}

/**
 * Generates the list of projectId params for static generation.
 * Used by Next.js during pre-rendering to build all project pages.
 *
 * @returns An array of projectId param objects.
 */
export async function generateStaticParams() {
  try {
    // Initialize project data from backend API
    await ProjectData.initialize();
    const projectIds = Object.keys(ProjectData.activeProjectsRecord);

    console.info(
      `📄 [generateStaticParams] Generated static params for ${projectIds.length} projects`,
    );

    return projectIds.map((projectId) => ({
      projectId,
    }));
  } catch (error) {
    // Backend not accessible - fall back to on-demand page generation
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.warn(
      `⚠️  [generateStaticParams] Backend not accessible (${errorMessage}) - falling back to on-demand page generation`,
    );
    return [];
  }
}
