"use client";

/**
 * Client boundary for the public project detail route.
 *
 * This wrapper exists to:
 * - Keep the route's server component minimal (Suspense + param extraction).
 * - Delegate data fetching and interactive navigation behavior to the client.
 * - Provide a single place to thread SSR-prefetched project data (when present) into the
 *   `ProjectViewWrapper`.
 */

import ProjectViewWrapper from "@/components/project-carousel-page/ProjectViewWrapper";

/**
 * Renders the client-side project view wrapper.
 *
 * @param props - Rendering inputs.
 * @param props.projectId - The project identifier from the route.
 * @param props.allowNda - Whether NDA projects may be shown in this context.
 * @param props.ssrParsed - Optional SSR-prefetched project dataset for hydration.
 * @param props.ssrIncludeNdaInActive - Whether the SSR dataset included NDA placeholders.
 */
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
