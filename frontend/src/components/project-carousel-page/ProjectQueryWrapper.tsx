"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import ProjectView from "@/components/project-carousel-page/ProjectView";
import ProjectData from "@/data/ProjectData";
import { useRouteChange } from "@/hooks/useRouteChange";
import { useAppSelector } from "@/store/hooks";

/**
 * Client-side wrapper that syncs projectId from the query string `?p=slug`.
 * This mirrors the behavior of ProjectViewWrapper (segment-based) but
 * uses the query-param model as source of truth.
 */
export default function ProjectQueryWrapper({
  allowNda,
  isAuthenticated,
  ssrParsed,
  ssrIncludeNdaInActive,
}: {
  allowNda: boolean;
  isAuthenticated?: boolean;
  ssrParsed?: import("@/data/ProjectData").ParsedPortfolioProjectData;
  ssrIncludeNdaInActive?: boolean;
}) {
  const searchParams = useSearchParams();
  const [ready, setReady] = useState(false);
  const [projectId, setProjectId] = useState<string>(
    searchParams.get("p") || "",
  );
  const initOnce = useRef(false);
  const { isLoggedIn, user } = useAppSelector((s) => s.auth);
  const includeNda =
    Boolean(allowNda) && (Boolean(isAuthenticated) || isLoggedIn || !!user);

  useEffect(() => {
    let cancelled = false;
    if (initOnce.current) {
      setReady(true);
      return;
    }
    (async () => {
      try {
        if (ssrParsed) {
          ProjectData.hydrate(
            ssrParsed,
            Boolean(ssrIncludeNdaInActive ?? includeNda),
          );
        } else {
          const haveProjects =
            Object.keys(ProjectData.activeProjectsRecord).length > 0;
          if (!haveProjects) {
            await ProjectData.initialize({
              disableCache: true,
              includeNdaInActive: includeNda,
            });
          }
        }
        initOnce.current = true;
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [includeNda, ssrParsed, ssrIncludeNdaInActive]);

  // React to query-string changes, but only for external/popstate/custom events
  useRouteChange(
    (_pathname, search) => {
      const p = new URLSearchParams(search).get("p") || "";
      if (p && p !== projectId) setProjectId(p);
    },
    { mode: "external-only" },
  );

  // Also sync on mount in case initial state differs; prefer live window.location.search
  useEffect(() => {
    try {
      const live = new URLSearchParams(window.location.search).get("p") || "";
      if (live && live !== projectId) setProjectId(live);
    } catch {
      const p = searchParams.get("p") || "";
      if (p && p !== projectId) setProjectId(p);
    }
  }, []);

  if (!ready) return <div>Loading project...</div>;
  if (!projectId) return <div>Oops! No project selected.</div>;

  return <ProjectView projectId={projectId} />;
}
