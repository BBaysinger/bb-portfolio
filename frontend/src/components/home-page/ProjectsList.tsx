// NOTE: This is a Server Component. Do NOT add 'use client'.
import { unstable_noStore as noStore } from "next/cache";
import { cookies, headers as nextHeaders } from "next/headers";

import ProjectsListClient from "@/components/home-page/ProjectsListClient";
import ProjectData from "@/data/ProjectData";

/**
 * Server component: ProjectsList
 *
 * Responsibilities
 * - Runs on the server during build (SSG) and at request time if revalidated.
 * - Loads all portfolio projects from `ProjectData`.
 * - Produces a combined `allProjects` array that includes:
 *   - Public (non-NDA) projects that appear in the main list
 *   - NDA projects as data entries (rendered as placeholders by the client)
 * - Delegates all rendering and interactivity to the client component
 *   (`ProjectsListClient`). This keeps the UI interactive while preserving
 *   static generation for data.
 */

const ProjectsList = async () => {
  // Mark this route as dynamic if auth can change NDA content.
  noStore();
  // Fetch fresh data per-request to honor auth and NDA differences
  // Detect authentication from cookies by calling our API route with forwarded cookies
  let isAuthenticated = false;
  try {
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    const cookieHeader = allCookies
      .map((c) => `${c.name}=${c.value}`)
      .join("; ");
    const hasPayloadToken = allCookies.some((c) => c.name === "payload-token");

    // Forward auth cookies to backend data fetch so NDA content resolves when allowed
    const forwardedHeaders: HeadersInit = cookieHeader
      ? { Cookie: cookieHeader }
      : {};
    await ProjectData.initialize({
      headers: forwardedHeaders,
      disableCache: true,
    });

    // Perform explicit auth check via /api/users/me for user presence (may still fail if token expired)
    if (cookieHeader) {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
      const tryAuthFetch = async (url: string) =>
        fetch(url, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...(cookieHeader && { Cookie: cookieHeader }),
          },
          cache: "no-store",
        });
      let res: Response | null = null;
      try {
        res = await tryAuthFetch(`${basePath}/api/users/me`);
        if (!res.ok) {
          const alt = await tryAuthFetch(`${basePath}/api/users/me/`);
          if (alt.ok) res = alt;
        }
      } catch {
        try {
          const h = await nextHeaders();
          const host = h.get("x-forwarded-host") ?? h.get("host");
          const proto = h.get("x-forwarded-proto") ?? "http";
          const origin = host
            ? `${proto}://${host}`
            : process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
          res = await tryAuthFetch(`${origin}${basePath}/api/users/me`);
        } catch {}
      }
      isAuthenticated = Boolean(res?.ok);
    }

    if (process.env.NODE_ENV !== "production") {
      console.info("[ProjectsList SSR] cookies", {
        cookieNames: allCookies.map((c) => c.name),
        hasPayloadToken,
        isAuthenticatedViaMe: isAuthenticated,
      });
    }
  } catch (err) {
    console.error("ProjectsList: failed to initialize ProjectData", err);
  }
  // Use listedProjects (active & not omitted) for the main grid, which may include NDA items.
  // The client decides how to render NDA entries as placeholders.
  const allProjects = [...ProjectData.listedProjects];
  if (
    process.env.DEBUG_PROJECT_DATA === "1" ||
    process.env.NODE_ENV !== "production"
  ) {
    try {
      const ndaCount = allProjects.filter((p) => p.nda || p.brandIsNda).length;
      const ndaProjects = allProjects.filter((p) => p.nda || p.brandIsNda);
      console.info("[ProjectsList SSR] state", {
        isAuthenticated,
        cookiePresent: (await cookies()).getAll()?.length > 0,
        listedCount: allProjects.length,
        ndaEntries: ndaCount,
        sampleNdaProject: ndaProjects[0]
          ? {
              id: ndaProjects[0].id,
              title: ndaProjects[0].title,
              nda: ndaProjects[0].nda,
              brandIsNda: ndaProjects[0].brandIsNda,
            }
          : null,
      });
    } catch {}
  }
  // Delegate rendering and interactivity to the client component.
  return (
    <ProjectsListClient
      allProjects={allProjects}
      isAuthenticated={isAuthenticated}
    />
  );
};

export default ProjectsList;
