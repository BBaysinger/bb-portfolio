"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import ProjectView from "@/components/project-carousel-page/ProjectView";
import ProjectData, { projectRequiresNda } from "@/data/ProjectData";
import { useProjectUrlSync } from "@/hooks/useProjectUrlSync";
import { useAppSelector } from "@/store/hooks";

/**
 * Client-side wrapper that syncs projectId from the query string `?p=slug`.
 * This mirrors the behavior of ProjectViewWrapper (segment-based) but
 * uses the query-param model as source of truth.
 */
export default function ProjectQueryWrapper({
  allowNda,
  ssrParsed,
  ssrIncludeNdaInActive,
}: {
  allowNda: boolean;
  ssrParsed?: import("@/data/ProjectData").ParsedPortfolioProjectData;
  ssrIncludeNdaInActive?: boolean;
}) {
  const searchParams = useSearchParams();
  const [ready, setReady] = useState(Boolean(ssrParsed));
  const [datasetEpoch, setDatasetEpoch] = useState(ssrParsed ? 1 : 0);
  const initialP = searchParams.get("p") || "";
  const [projectId] = useProjectUrlSync(initialP, {
    fallbackFromPathSegment: true,
    // Hash uniquing is controlled by NEXT_PUBLIC_FORCE_HASH_HISTORY; leave default here
  });
  const initOnce = useRef(false);
  const hydratedFromSsr = useRef(false);
  const { isLoggedIn, user } = useAppSelector((s) => s.auth);
  // Keep query wrapper aligned with the two-mode carousel contract.
  // Public routes omit NDA entirely; NDA routes include placeholders.
  void isLoggedIn;
  void user;
  const includeNdaInActive = Boolean(allowNda);

  // Hydrate synchronously once when a server snapshot is provided.
  if (ssrParsed && !hydratedFromSsr.current) {
    try {
      ProjectData.hydrate(
        ssrParsed,
        Boolean(ssrIncludeNdaInActive ?? includeNdaInActive),
      );
      initOnce.current = true;
      hydratedFromSsr.current = true;
    } catch {
      // fall back to async init
    }
  }

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
            Boolean(ssrIncludeNdaInActive ?? includeNdaInActive),
          );
          setDatasetEpoch((e) => e + 1);
        } else {
          const haveProjects =
            Object.keys(ProjectData.activeProjectsRecord).length > 0;
          if (!haveProjects) {
            try {
              await ProjectData.initialize({
                disableCache: true,
                includeNdaInActive,
              });
              setDatasetEpoch((e) => e + 1);
            } catch {
              return;
            }
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
  }, [includeNdaInActive, ssrParsed, ssrIncludeNdaInActive]);

  // Public route safety: if the current slug resolves to an NDA project,
  // do not attempt to render it here.
  useEffect(() => {
    if (!ready) return;
    if (allowNda) return;
    if (!projectId) return;
    try {
      const p = ProjectData.getProject(projectId);
      if (projectRequiresNda(p)) {
        // Segment routes handle canonicalization/redirects; query route should avoid NDA rendering.
        window.location.href = `/nda/${encodeURIComponent(projectId)}/`;
      }
    } catch {
      // ignore
    }
  }, [ready, allowNda, projectId]);

  // NDA edge handling: probe auth status on entry/visibility/focus to refresh dataset
  // so confidential fields are sanitized or expanded to match current auth state.
  useEffect(() => {
    if (!ready) return;
    if (!allowNda) return;
    let cancelled = false;
    let probing = false;

    const probeAuthAndRefresh = async () => {
      if (probing) return;
      probing = true;
      try {
        const resp = await fetch("/api/users/me/", {
          method: "GET",
          credentials: "include",
          headers: { Accept: "application/json" },
        });
        void resp;
        await ProjectData.initialize({
          disableCache: true,
          includeNdaInActive: true,
        });
        if (!cancelled) setDatasetEpoch((e) => e + 1);
      } catch {
        // ignore
      } finally {
        probing = false;
      }
    };

    probeAuthAndRefresh();
    const onVisibility = () => {
      if (document.visibilityState === "visible") probeAuthAndRefresh();
    };
    const onFocus = () => probeAuthAndRefresh();
    window.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      window.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onFocus);
    };
  }, [ready, allowNda]);

  if (!ready) return <div>Loading project...</div>;
  if (!projectId) return <div>Oops! No project selected.</div>;

  return <ProjectView key={`dataset-${datasetEpoch}`} projectId={projectId} />;
}
