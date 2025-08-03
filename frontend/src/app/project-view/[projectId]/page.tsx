import { notFound } from "next/navigation";

import ProjectView from "@/components/project-carousel-page/ProjectView";
import ProjectData from "@/data/ProjectData";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  if (!projectId || !ProjectData.activeProjectsRecord[projectId]) {
    return notFound();
  }

  return <ProjectView projectId={projectId} />;
}

export async function generateStaticParams(): Promise<{ projectId: string }[]> {
  return Object.keys(ProjectData.activeProjectsRecord).map((projectId) => ({
    projectId,
  }));
}
