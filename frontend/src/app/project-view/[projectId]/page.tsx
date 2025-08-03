import { notFound } from "next/navigation";
import { Suspense } from "react";

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

  return (
    <Suspense fallback={<div>Loading project...</div>}>
      <ProjectView projectId={projectId} />
    </Suspense>
  );
}

export async function generateStaticParams() {
  return Object.keys(ProjectData.activeProjectsRecord).map((projectId) => ({
    projectId,
  }));
}
