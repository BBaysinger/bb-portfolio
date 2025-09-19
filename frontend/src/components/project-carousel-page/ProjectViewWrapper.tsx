"use client";

import { useState } from "react";

import ProjectView from "@/components/project-carousel-page/ProjectView";
import { useRouteChange } from "@/hooks/useRouteChange";
import { getDynamicPathParam } from "@/utils/getDynamicPathParam";

/**
 * Renders the ProjectView statically with a given projectId.
 * This component runs as a client component and is hydrated after SSR.
 */
interface ProjectPageProps {
  params: {
    projectId: string;
  };
}

/**
 * A client-side wrapper that receives a statically generated projectId.
 * This component is rendered on the client and hydrated after SSR.
 *
 * It delegates rendering to `ProjectViewRouterBridge`, which revalidates
 * the current projectId on the client and supports dynamic updates if the route
 * changes via `window.history.pushState()`.
 *
 * @param params - Route parameters provided by Next.js, including the static `projectId`.
 * @returns A hydrated React component containing the project view.
 */
export default function ProjectViewWrapper({ params }: ProjectPageProps) {
  return <ProjectViewRouterBridge initialProjectId={params.projectId} />;
}

function ProjectViewRouterBridge({
  initialProjectId,
}: {
  initialProjectId: string;
}) {
  const [projectId, setProjectId] = useState(initialProjectId);

  useRouteChange(() => {
    const newId = getDynamicPathParam(-1, initialProjectId);
    if (newId && newId !== projectId) {
      setProjectId(newId);
    }
  });

  if (!projectId) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <h2>Oops! No project ID was provided!</h2>
        <p>This page expects a valid projectId parameter.</p>
      </div>
    );
  }

  return <ProjectView projectId={projectId} />;
}
