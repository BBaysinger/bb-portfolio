"use client";

import { notFound } from "next/navigation";
import { useSearchParams } from "next/navigation";

import ProjectClientPage from "@/components/project-carousel-page/ProjectClientPage";
import ProjectData from "@/data/ProjectData";

export default function ProjectPage() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get("project");

  if (!projectId || !ProjectData.activeProjectsRecord[projectId]) {
    return notFound();
  }

  return <ProjectClientPage />;
}
