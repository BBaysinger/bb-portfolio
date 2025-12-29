"use client";

import ProjectViewWrapper from "@/components/project-carousel-page/ProjectViewWrapper";

export default function ProjectClientBoundary(props: {
  projectId: string;
  allowNda: boolean;
  ssrParsed?: import("@/data/ProjectData").ParsedPortfolioProjectData;
  ssrIncludeNdaInActive?: boolean;
}) {
  const { projectId, allowNda, ssrParsed, ssrIncludeNdaInActive } = props;
  return (
    <ProjectViewWrapper
      params={{ projectId }}
      allowNda={allowNda}
      ssrParsed={ssrParsed}
      ssrIncludeNdaInActive={ssrIncludeNdaInActive}
    />
  );
}
