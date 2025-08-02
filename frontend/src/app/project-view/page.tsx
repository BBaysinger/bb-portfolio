"use client";

import { notFound } from "next/navigation";

import ProjectClientPage from "@/components/project-carousel-page/ProjectClientPage";
import ProjectData from "@/data/ProjectData";

type Props = {
  params: {
    projectId: string;
  };
};

export default function ProjectPage({ params }: Props) {
  const { projectId } = params;

  if (!projectId || !ProjectData.activeProjectsRecord[projectId]) {
    return notFound();
  }

  return <ProjectClientPage projectId={projectId} />;
}
