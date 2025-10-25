// NOTE: This is a Server Component. Do NOT add 'use client'.
import { unstable_noStore as noStore } from "next/cache";
import { cookies } from "next/headers";

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
    const cookieHeader = cookieStore.toString();

    // Forward auth cookies to backend data fetch so NDA content resolves when allowed
    const forwardedHeaders: HeadersInit = cookieHeader
      ? { Cookie: cookieHeader }
      : {};
    await ProjectData.initialize({
      headers: forwardedHeaders,
      disableCache: true,
    });

    // Server-side auth check via local API proxy
    if (cookieHeader) {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/api/users/me`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...(cookieHeader && { Cookie: cookieHeader }),
          },
          cache: "no-store",
        },
      );
      isAuthenticated = res.ok;
    }
  } catch (err) {
    console.error("ProjectsList: failed to initialize ProjectData", err);
    // Continue gracefully; client will render empty state if no items
  }
  // Use listedProjects (active & not omitted) for the main grid, which may include NDA items.
  // The client decides how to render NDA entries as placeholders.
  const allProjects = [...ProjectData.listedProjects];
  // Delegate rendering and interactivity to the client component.
  return (
    <ProjectsListClient
      allProjects={allProjects}
      isAuthenticated={isAuthenticated}
    />
  );
};

export default ProjectsList;
