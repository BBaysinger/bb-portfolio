"use client";

/**
 * Client boundary for NDA project routes.
 *
 * The App Router page/layout for `/nda/[projectId]` can be server-rendered, but the interactive
 * project view wrapper is a Client Component. This file isolates the client-only boundary and
 * forwards SSR-derived props into the interactive UI.
 */

import ProjectViewWrapper from "@/components/project-carousel-page/ProjectViewWrapper";

/**
 * Thin client-side wrapper around `ProjectViewWrapper` for NDA content.
 *
 * `allowNda` is explicitly enabled so the wrapper can render NDA-only content when the
 * authenticated/authorized path is active.
 */
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
