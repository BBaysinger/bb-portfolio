"use client";

import ProjectViewWrapper from "@/components/project-carousel-page/ProjectViewWrapper";

export default function NdaProjectClientBoundary(props: {
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
