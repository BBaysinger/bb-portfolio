"use client";

/**
 * Client boundary for NDA-included project routes.
 *
 * This route is the "authenticated browsing" flavor of the project carousel:
 * it allows NDA projects to exist in the active dataset (placeholders when not authed).
 */

import ProjectViewWrapper from "@/components/project-carousel-page/ProjectViewWrapper";

export default function NdaIncludedProjectClientBoundary(props: {
  projectId: string;
  ssrParsed?: import("@/data/ProjectData").ParsedPortfolioProjectData;
  ssrIncludeNdaInActive?: boolean;
  ssrContainsSanitizedPlaceholders?: boolean;
}) {
  const {
    projectId,
    ssrParsed,
    ssrIncludeNdaInActive,
    ssrContainsSanitizedPlaceholders,
  } = props;

  return (
    <ProjectViewWrapper
      params={{ projectId }}
      allowNda={true}
      ssrParsed={ssrParsed}
      ssrIncludeNdaInActive={ssrIncludeNdaInActive}
      ssrContainsSanitizedPlaceholders={ssrContainsSanitizedPlaceholders}
    />
  );
}
