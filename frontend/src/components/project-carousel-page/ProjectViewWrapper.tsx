"use client";

import { useEffect, useRef, useState } from "react";

import ProjectView from "@/components/project-carousel-page/ProjectView";
import ProjectData from "@/data/ProjectData";
import { useRouteChange } from "@/hooks/useRouteChange";
import { useAppSelector } from "@/store/hooks";
import { getDynamicPathParam } from "@/utils/getDynamicPathParam";
import {
  navigateWithPushState,
  replaceWithReplaceState,
} from "@/utils/navigation";

/**
 * Renders the ProjectView statically with a given projectId.
 * This component runs as a client component and is hydrated after SSR.
 */
interface ProjectPageProps {
  params: {
    projectId: string;
  };
  /** Whether NDA projects are allowed to be included in the active dataset on this route. */
  allowNda?: boolean;
  /** Optional parsed snapshot from SSR to hydrate client without refetch. */
  ssrParsed?: import("@/data/ProjectData").ParsedPortfolioProjectData;
  /** Whether SSR dataset included NDA in active set. */
  ssrIncludeNdaInActive?: boolean;
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
export default function ProjectViewWrapper({
  params,
  allowNda,
  ssrParsed,
  ssrIncludeNdaInActive,
}: ProjectPageProps) {
  // Ensure project data is available on the client after hydration.
  const [ready, setReady] = useState(false);
  // Increment this when the underlying ProjectData active set fundamentally changes
  // (e.g., NDA entries added after an includeNda initialization) so the carousel remounts.
  const [datasetEpoch, setDatasetEpoch] = useState(0);
  const initOnce = useRef(false);
  const {
    /* isLoggedIn, user */
  } = useAppSelector((s) => s.auth);
  // On NDA routes, include NDA items in the active carousel set even if unauthenticated.
  // The fetch layer already redacts sensitive fields and will emit placeholders when not logged in.
  const includeNdaInActive = Boolean(allowNda);

  useEffect(() => {
    let cancelled = false;
    if (initOnce.current) {
      setReady(true);
      return;
    }
    (async () => {
      try {
        // If SSR provided a parsed snapshot, hydrate it first to avoid
        // a client refetch that could drop NDA fields due to cookie scoping.
        if (ssrParsed) {
          ProjectData.hydrate(
            ssrParsed,
            Boolean(ssrIncludeNdaInActive ?? includeNdaInActive),
          );
          setDatasetEpoch((e) => e + 1);
        } else {
          if (!allowNda) {
            // Public route: always enforce a clean non-NDA active set.
            await ProjectData.initialize({
              disableCache: true,
              includeNdaInActive: false,
            });
            setDatasetEpoch((e) => e + 1);
          } else {
            // NDA route: always ensure dataset is initialized according to current auth
            // state so NDA items are included when allowed.
            await ProjectData.initialize({
              disableCache: true,
              includeNdaInActive,
            });
            setDatasetEpoch((e) => e + 1);
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
  }, []);

  if (!ready) {
    return <div>Loading project...</div>;
  }

  return (
    <ProjectViewRouterBridge
      initialProjectId={params.projectId}
      allowNda={Boolean(allowNda)}
      datasetEpoch={datasetEpoch}
    />
  );
}

function ProjectViewRouterBridge({
  initialProjectId,
  allowNda,
  datasetEpoch,
}: {
  initialProjectId: string;
  allowNda: boolean;
  datasetEpoch: number;
}) {
  const [projectId, setProjectId] = useState(initialProjectId);
  const firstUrlSyncRef = useRef(true);
  // On NDA routes, include NDA items in active set even if not logged in (placeholders allowed).
  const includeNdaInActive = Boolean(allowNda);
  const [epoch, setEpoch] = useState(0);

  // If we navigated in with an NDA project and the active map doesn't have it yet,
  // re-initialize once when auth becomes available.
  useEffect(() => {
    if (!allowNda) return; // On public route, never pull NDA into active set.
    const ensureNdaPresent = async () => {
      // If NDA is allowed and current active set lacks NDA items,
      // reinitialize to include them and bump epoch to remount the carousel.
      const hasNdaInActive = ProjectData.activeProjects.some((p) => !!p.nda);
      if (!hasNdaInActive) {
        await ProjectData.initialize({
          disableCache: true,
          includeNdaInActive: true,
        });
        setEpoch((e) => e + 1);
      }
    };
    ensureNdaPresent();
  }, [includeNdaInActive, projectId, allowNda]);

  useRouteChange(
    (_pathname, search) => {
      // Prefer query param `p` when present; fall back to last path segment
      const p = new URLSearchParams(search).get("p");
      const newId = p || getDynamicPathParam(-1, initialProjectId);
      if (newId && newId !== projectId) {
        console.info("Route bridge updating projectId:", projectId, "→", newId);
        setProjectId(newId);
      }
    },
    // Important: ignore internal Next.js router noise (e.g., refocus-triggered refreshes)
    // and only react to true external navigation (popstate/custom bb:routechange).
    // This prevents the carousel from snapping back to the original segment slug on refocus.
    { mode: "external-only" },
  );

  // Also sync projectId on mount/remount to handle edge cases
  useEffect(() => {
    const p =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("p")
        : null;
    const currentId = p || getDynamicPathParam(-1, initialProjectId);
    if (currentId && currentId !== projectId) {
      setProjectId(currentId);
    }
  }, [initialProjectId, projectId]);

  // Sync URL query with active project. Use pushState for user-driven changes so Back/Forward works.
  // Use replaceState only for the initial hydrate or corrective normalization.
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
      if (process.env.NODE_ENV !== "production") {
        console.info("[ProjectViewRouterBridge] initial URL sync (replace)", {
          from: window.location.href,
          to: nextHref,
          projectId,
        });
      }
      replaceWithReplaceState(nextHref);
      firstUrlSyncRef.current = false;
    } else {
      // Force unique history entries even if some browsers coalesce rapid query-only changes.
      if (process.env.NODE_ENV !== "production") {
        console.info("[ProjectViewRouterBridge] push projectId", {
          from: window.location.href,
          to: nextHref,
          projectId,
        });
      }
      navigateWithPushState(
        nextHref,
        { projectId },
        { useHashHistory: true, hashParam: "pid", hashValue: projectId },
      );
    }
  }, [projectId]);

  // Removed path segment normalization: path slug stays stable; only ?p changes create history entries.

  // Explicit popstate listener (belt & suspenders) to ensure Back/Forward restores projectId
  // even if a race suppresses custom bb:routechange or useRouteChange misses a signature.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = () => {
      try {
        const qs = new URLSearchParams(window.location.search);
        const p = qs.get("p") || getDynamicPathParam(-1, initialProjectId);
        if (process.env.NODE_ENV !== "production") {
          console.info("[ProjectViewRouterBridge] popstate detected", {
            url: window.location.href,
            p,
            currentProjectId: projectId,
          });
        }
        if (p && p !== projectId) {
          setProjectId(p);
        }
      } catch (err) {
        if (process.env.NODE_ENV !== "production") {
          console.warn("[ProjectViewRouterBridge] popstate handler error", err);
        }
      }
    };
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, [projectId, initialProjectId]);

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

  // Use datasetEpoch from parent and local epoch to force remounts when data shape changes
  return (
    <ProjectView
      key={`dataset-${datasetEpoch}-${epoch}`}
      projectId={projectId}
    />
  );
}
