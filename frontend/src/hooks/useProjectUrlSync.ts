"use client";

import { useEffect, useRef, useState } from "react";

import { useRouteChange } from "@/hooks/useRouteChange";
import { getDynamicPathParam } from "@/utils/getDynamicPathParam";
import {
  navigateWithPushState,
  replaceWithReplaceState,
} from "@/utils/navigation";

/**
 * useProjectUrlSync
 *
 * Contract
 * - Input: initialProjectId from the current route entry (segment or query).
 * - Behavior: Keeps `?p` in sync with the active projectId.
 *   - First sync uses replaceState (avoid polluting history).
 *   - Subsequent changes use pushState with optional hash uniquing.
 * - Listens to external-only route changes (popstate + custom bb:routechange)
 *   and updates local state from either `?p` or the last path segment.
 * - Adds a popstate fallback listener for extra reliability.
 *
 * Returns: [projectId, setProjectId]
 */
export function useProjectUrlSync(
  initialProjectId: string,
  opts?: {
    /** When true, if `?p` is absent we fallback to the last path segment */
    fallbackFromPathSegment?: boolean;
  },
): [string, React.Dispatch<React.SetStateAction<string>>] {
  const DEBUG = process.env.NEXT_PUBLIC_DEBUG_NAVIGATION === "1";
  const fallbackFromPathSegment = opts?.fallbackFromPathSegment ?? true;
  // Hash uniquing removed for simplicity; Back/Forward is stable without it in supported browsers.

  const [projectId, setProjectId] = useState<string>(initialProjectId);
  const firstUrlSyncRef = useRef(true);

  // Listen for external route changes and update local state from URL
  useRouteChange(
    (_pathname, search) => {
      const p = new URLSearchParams(search).get("p") || "";
      const fromSeg = fallbackFromPathSegment
        ? getDynamicPathParam(-1, initialProjectId)
        : "";
      const next = p || fromSeg;
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
      const live = (() => {
        try {
          const qp = new URLSearchParams(window.location.search).get("p") || "";
          if (qp) return qp;
        } catch {}
        return fallbackFromPathSegment
          ? getDynamicPathParam(-1, initialProjectId)
          : "";
      })();
      if (live && live !== projectId) setProjectId(live);
    });
    return () => cancelAnimationFrame(frame);
  }, [fallbackFromPathSegment, initialProjectId, projectId]);

  // Keep URL in sync with projectId: initial replace, then push
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!projectId) return;

    const url = new URL(window.location.href);
    const currentP = url.searchParams.get("p");
    if (currentP === projectId) return;

    url.searchParams.set("p", projectId);
    const nextHref = url.toString();
    const isInitial = firstUrlSyncRef.current;

    if (isInitial) {
      if (DEBUG)
        console.info("[useProjectUrlSync] initial URL sync (replace)", {
          from: window.location.href,
          to: nextHref,
          projectId,
        });
      replaceWithReplaceState(nextHref);
      firstUrlSyncRef.current = false;
    } else {
      if (DEBUG)
        console.info("[useProjectUrlSync] push projectId", {
          from: window.location.href,
          to: nextHref,
          projectId,
        });
      navigateWithPushState(nextHref, { projectId });
    }
  }, [projectId, DEBUG]);

  // Explicit popstate fallback to ensure Back/Forward restores projectId
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = () => {
      try {
        const qs = new URLSearchParams(window.location.search);
        const p =
          qs.get("p") ||
          (fallbackFromPathSegment
            ? getDynamicPathParam(-1, initialProjectId)
            : "");
        if (DEBUG) {
          console.info("[useProjectUrlSync] popstate detected", {
            url: window.location.href,
            p,
            currentProjectId: projectId,
          });
        }
        if (p && p !== projectId) {
          setProjectId(p);
        }
      } catch (err) {
        if (DEBUG) {
          console.warn("[useProjectUrlSync] popstate handler error", err);
        }
      }
    };
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, [projectId, initialProjectId, fallbackFromPathSegment, DEBUG]);

  return [projectId, setProjectId];
}
