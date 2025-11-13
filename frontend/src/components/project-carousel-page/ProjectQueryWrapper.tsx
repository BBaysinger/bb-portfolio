"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import ProjectView from "@/components/project-carousel-page/ProjectView";
import ProjectData from "@/data/ProjectData";
import { useProjectUrlSync } from "@/hooks/useProjectUrlSync";
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
  const initialP = searchParams.get("p") || "";
  const [projectId] = useProjectUrlSync(initialP, {
    fallbackFromPathSegment: true,
    useHashHistory: true,
    hashParam: "pid",
  });
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

  if (!ready) return <div>Loading project...</div>;
  if (!projectId) return <div>Oops! No project selected.</div>;

  return <ProjectView projectId={projectId} />;
}
