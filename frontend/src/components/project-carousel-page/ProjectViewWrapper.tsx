"use client";

import { useEffect, useRef, useState } from "react";

import ProjectView from "@/components/project-carousel-page/ProjectView";
import ProjectData from "@/data/ProjectData";
import { useRouteChange } from "@/hooks/useRouteChange";
import { useAppSelector } from "@/store/hooks";
import { getDynamicPathParam } from "@/utils/getDynamicPathParam";

/**
 * Renders the ProjectView statically with a given projectId.
 * This component runs as a client component and is hydrated after SSR.
 */
interface ProjectPageProps {
  params: {
    projectId: string;
  };
  /** SSR-computed auth state, used to include NDA projects on first client init. */
  isAuthenticated?: boolean;
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
  isAuthenticated,
  allowNda,
  ssrParsed,
  ssrIncludeNdaInActive,
}: ProjectPageProps) {
  // Ensure project data is available on the client after hydration.
  const [ready, setReady] = useState(false);
  const initOnce = useRef(false);
  const { isLoggedIn, user } = useAppSelector((s) => s.auth);
  const includeNdaInActive =
    Boolean(allowNda) && (Boolean(isAuthenticated) || isLoggedIn || !!user);

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
        } else {
          if (!allowNda) {
            // Public route: always enforce a clean non-NDA active set.
            await ProjectData.initialize({
              disableCache: true,
              includeNdaInActive: false,
            });
          } else {
            const haveProjects =
              Object.keys(ProjectData.activeProjectsRecord).length > 0;
            if (!haveProjects) {
              await ProjectData.initialize({
                disableCache: true,
                includeNdaInActive,
              });
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
  }, []);

  if (!ready) {
    return <div>Loading project...</div>;
  }

  return (
    <ProjectViewRouterBridge
      initialProjectId={params.projectId}
      allowNda={Boolean(allowNda)}
    />
  );
}

function ProjectViewRouterBridge({
  initialProjectId,
  allowNda,
}: {
  initialProjectId: string;
  allowNda: boolean;
}) {
  const [projectId, setProjectId] = useState(initialProjectId);
  const { isLoggedIn, user } = useAppSelector((s) => s.auth);
  const includeNdaInActive = Boolean(allowNda) && (isLoggedIn || !!user);

  // If we navigated in with an NDA project and the active map doesn't have it yet,
  // re-initialize once when auth becomes available.
  useEffect(() => {
    if (!allowNda) return; // On public route, never pull NDA into active set.
    const ensureNdaPresent = async () => {
      const current = ProjectData.activeProjectsRecord[projectId];
      if (!current && includeNdaInActive) {
        await ProjectData.initialize({
          disableCache: true,
          includeNdaInActive: true,
        });
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
