"use client";
import {
  MagnifierViewer,
  ViewerItem,
} from "@/components/home-page/MagnifierViewer";
import ProjectsList from "@/components/home-page/ProjectsList";
import { ParsedPortfolioProject } from "@/data/ProjectData";
import { useHasHover } from "@/hooks/useHasHover";

interface PortfolioListStyleSwapperProps {
  allProjects: ParsedPortfolioProject[];
  isAuthenticated: boolean;
  renderThumbnail?: (
    project: ParsedPortfolioProject,
    index: number,
    props: {
      isAuthenticated: boolean;
    },
  ) => React.ReactNode;
}

export default function PortfolioListStyleSwapper({
  allProjects = [],
  isAuthenticated,
  renderThumbnail,
}: PortfolioListStyleSwapperProps) {
  const hasHover = useHasHover();
  // Map allProjects to MagnifierViewer's ViewerItem format
  const magnifierItems: ViewerItem[] = allProjects.map((project) => ({
    id: project.id,
    title: project.title,
    subtitle: project.brandId,
    description:
      project.nda || project.brandIsNda
        ? "Confidential project. Log in to view details."
        : undefined,
    thumbUrl: project.thumbUrl,
  }));

  if (hasHover) {
    return (
      <ProjectsList
        allProjects={allProjects}
        isAuthenticated={isAuthenticated}
        renderThumbnail={renderThumbnail}
      />
    );
  }
  return <MagnifierViewer items={magnifierItems} />;
}
