"use client";
import MagnifierProjectsList from "@/components/home-page/MagnifierProjectsList";
import { MagnifierViewer } from "@/components/home-page/MagnifierViewer";
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
  let hasHover = useHasHover();

  hasHover = true; // Short circuit to force normal layout to test a better solution...

  if (hasHover) {
    return (
      <ProjectsList
        allProjects={allProjects}
        isAuthenticated={isAuthenticated}
        renderThumbnail={renderThumbnail}
      />
    );
  }

  return (
    <MagnifierViewer
      renderList={(context) => (
        <MagnifierProjectsList projects={allProjects} context={context} />
      )}
    />
  );
}
