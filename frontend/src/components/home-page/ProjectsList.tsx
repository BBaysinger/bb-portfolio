// NOTE: This is a Server Component. Do NOT add 'use client'.
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
  // Ensure project data is available (idempotent init)
  try {
    if (
      !ProjectData["_projects"] ||
      Object.keys(ProjectData["_projects"]).length === 0
    ) {
      await ProjectData.initialize();
    }
  } catch (err) {
    console.error("ProjectsList: failed to initialize ProjectData", err);
    // Continue gracefully; client will render empty state if no items
  }
  // Use listedProjects (active & not omitted) for the main grid, which may include NDA items.
  // The client decides how to render NDA entries as placeholders.
  const allProjects = [...ProjectData.listedProjects];
  // Delegate rendering and interactivity to the client component.
  return <ProjectsListClient allProjects={allProjects} />;
};

export default ProjectsList;
