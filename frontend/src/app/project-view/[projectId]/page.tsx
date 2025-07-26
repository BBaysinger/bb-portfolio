import { notFound } from "next/navigation";

import ProjectClientPage from "@/components/project-carousel-page/ProjectClientPage";
import ProjectData from "@/data/ProjectData";

// Static params generator — used by static export
export function generateStaticParams() {
  return ProjectData.activeProjects.map((project) => ({
    projectId: project.id,
  }));
}

// Next.js 15+ compatible dynamic route page
export default async function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  const projectExists = ProjectData.activeProjectsRecord[projectId];
  if (!projectExists) return notFound();

  return <ProjectClientPage projectId={projectId} />;
}
