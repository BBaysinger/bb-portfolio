"use client";

import { useEffect, useState } from "react";

import { useRouteChange } from "@/hooks/useRouteChange";

import ProjectView from "./ProjectView";

/**
 * Wrapper component for ProjectView that synchronizes the `projectId`
 * from the current browser pathname. This component must only run
 * in the browser and will throw during SSR in development to catch misuse.
 *
 * @component ProjectViewWrapper
 * @throws Error during development if rendered on the server.
 */
export default function ProjectViewWrapper() {
  const [projectId, setProjectId] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") {
      if (process.env.NODE_ENV !== "production") {
        throw new Error(
          "ProjectViewWrapper must only be used in the browser. " +
            "It cannot run during server-side rendering.",
        );
      }
      return;
    }

    setProjectId(window.location.pathname.split("/").pop() ?? "");
  }, []);

  useRouteChange((pathname) => {
    const newId = pathname.split("/").pop() ?? "";
    setProjectId(newId);
  });

  if (!projectId) return null;

  return <ProjectView projectId={projectId} />;
}
