// NOTE: This is a Server Component. Do NOT add 'use client'.

import jwt from "jsonwebtoken";
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
  // Detect authentication from cookies
  let isAuthenticated = false;
  try {
    // Forward cookies/headers for authenticated fetch to Payload
    const cookieStore = await cookies();
    const cookieHeader = cookieStore.toString();
    // Attempt to extract and verify JWT token from cookies
    let token = null;
    // Example: look for 'payload-token' cookie (adjust name as needed)
    const match = cookieHeader.match(/payload-token=([^;]+)/);
    if (match) {
      token = match[1];
      try {
        // Replace 'your-secret-key' with your actual JWT secret or public key
        jwt.verify(token, process.env.PAYLOAD_JWT_SECRET || "your-secret-key");
        isAuthenticated = true;
      } catch (_jwtErr) {
        // Token invalid or expired
        isAuthenticated = false;
      }
    }
    const forwardedHeaders: HeadersInit = {
      Cookie: cookieHeader,
    };
    await ProjectData.initialize({
      headers: forwardedHeaders,
      disableCache: true,
    });
    // Optionally, also check NDA project data for real details
    // const ndaProjects = ProjectData.listedProjects.filter(p => p.nda);
    // isAuthenticated = ndaProjects.some(p => p.title !== "Confidential Project");
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
