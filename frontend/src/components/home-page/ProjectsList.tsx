import ProjectsListClient from "@/components/home-page/ProjectsListClient";
import ProjectData from "@/data/ProjectData";

const ProjectsList = async () => {
  if (
    !ProjectData["_projects"] ||
    Object.keys(ProjectData["_projects"]).length === 0
  ) {
    await ProjectData.initialize();
  }
  const allProjects = [
    ...ProjectData.listedProjects,
    ...Object.values(ProjectData["_projects"] || {}).filter(
      (p) => p.nda && !ProjectData.listedKeys.includes(p.id),
    ),
  ];
  return <ProjectsListClient allProjects={allProjects} />;
};

export default ProjectsList;
