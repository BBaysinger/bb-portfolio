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
  if (
    !ProjectData["_projects"] ||
    Object.keys(ProjectData["_projects"]).length === 0
  ) {
    await ProjectData.initialize();
  }
  // Combine public listed projects with NDA entries that should display
  // placeholders in the grid. The client decides how to render each.
  const allProjects = [
    ...ProjectData.listedProjects,
    ...Object.values(ProjectData["_projects"] || {}).filter(
      (p) => p.nda && !ProjectData.listedKeys.includes(p.id),
    ),
  ];
  // Delegate rendering and interactivity to the client component.
  return <ProjectsListClient allProjects={allProjects} />;
};

export default ProjectsList;
