"use client";

import { useEffect, useState } from "react";

import { useRouteChange } from "@/hooks/useRouteChange";
import { getCommittedProjectIdFromLocation } from "@/utils/projectRoute";

/**
 * useProjectUrlSync
 *
 * Contract
 * - Input: initialProjectId from the current route entry.
 * - Behavior: Treats the dynamic path segment as the single source of truth.
 * - Listens to external-only route changes (popstate + custom bb:routechange)
 *   and updates local state from the last path segment.
 * - Adds a popstate fallback listener for extra reliability.
 *
 * Returns: [projectId, setProjectId]
 */
export function useProjectUrlSync(
  initialProjectId: string,
): [string, React.Dispatch<React.SetStateAction<string>>] {
  const DEBUG = process.env.NEXT_PUBLIC_DEBUG_NAVIGATION === "1";

  const [projectId, setProjectId] = useState<string>(initialProjectId);

  // Listen for external route changes and update local state from URL
  useRouteChange(
    (_pathname) => {
      const next = getCommittedProjectIdFromLocation(initialProjectId);
      if (next && next !== projectId) {
        if (DEBUG)
          console.info("[useProjectUrlSync] external route -> projectId", {
            from: projectId,
            to: next,
          });
        setProjectId(next);
      }
    },
    { mode: "external-only" },
  );

  // Sync from live window location on mount (belt & suspenders)
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const live = getCommittedProjectIdFromLocation(initialProjectId);
      if (live && live !== projectId) setProjectId(live);
    });
    return () => cancelAnimationFrame(frame);
  }, [initialProjectId, projectId]);

  // Explicit popstate fallback to ensure Back/Forward restores projectId
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = () => {
      try {
        const next = getCommittedProjectIdFromLocation(initialProjectId);
        if (DEBUG) {
          console.info("[useProjectUrlSync] popstate detected", {
            url: window.location.href,
            next,
            currentProjectId: projectId,
          });
        }
        if (next && next !== projectId) {
          setProjectId(next);
        }
      } catch (err) {
        if (DEBUG) {
          console.warn("[useProjectUrlSync] popstate handler error", err);
        }
      }
    };
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, [projectId, initialProjectId, DEBUG]);

  return [projectId, setProjectId];
}
