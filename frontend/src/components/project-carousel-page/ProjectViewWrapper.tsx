"use client";

import { useEffect, useRef, useState } from "react";

import CanonicalLink from "@/components/common/CanonicalLink";
import ProjectView from "@/components/project-carousel-page/ProjectView";
import ProjectData from "@/data/ProjectData";
import { useProjectUrlSync } from "@/hooks/useProjectUrlSync";
import { useAppSelector } from "@/store/hooks";

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
  /** Whether SSR dataset contained sanitized placeholders (no NDA access). */
  ssrContainsSanitizedPlaceholders?: boolean;
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
  ssrContainsSanitizedPlaceholders,
}: ProjectPageProps) {
  // Dataset selection:
  // - Public routes (/project/*): do NOT include NDA projects in active navigation.
  // - NDA-included routes (/nda-included/*): include NDA placeholders in active navigation.
  const includeNdaInActive = Boolean(allowNda);
  const [didHydrateFromSsr] = useState(() => {
    if (!ssrParsed) return false;
    try {
      ProjectData.hydrate(
        ssrParsed,
        Boolean(ssrIncludeNdaInActive ?? includeNdaInActive),
        {
          containsSanitizedPlaceholders: ssrContainsSanitizedPlaceholders,
        },
      );
      return true;
    } catch {
      return false;
    }
  });

  const { isLoggedIn, user, hasInitialized } = useAppSelector((s) => s.auth);
  const clientAuth = isLoggedIn || !!user;
  const prevAuthRef = useRef(clientAuth);
  const [clientBootstrapPending, setClientBootstrapPending] = useState(false);

  useEffect(() => {
    const routeHasProject = Boolean(ProjectData.getProject(params.projectId));
    if (didHydrateFromSsr && routeHasProject) return;

    let cancelled = false;
    setClientBootstrapPending(true);

    (async () => {
      try {
        await ProjectData.initialize({
          disableCache: true,
          includeNdaInActive,
        });
      } catch {
        if (!cancelled) {
          setClientBootstrapPending(false);
        }
        return;
      }

      if (cancelled) return;
      setClientBootstrapPending(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [didHydrateFromSsr, includeNdaInActive, params.projectId]);

  useEffect(() => {
    if (!allowNda) {
      prevAuthRef.current = clientAuth;
      return;
    }
    if (!hasInitialized) return;

    const projectId = params.projectId;
    const routeHasProject = Boolean(
      ProjectData.activeProjectsRecord?.[projectId],
    );
    const shouldUpgradeAfterLogin =
      clientAuth &&
      (Boolean(ssrContainsSanitizedPlaceholders) || !routeHasProject);
    const shouldDowngradeAfterLogout = prevAuthRef.current && !clientAuth;

    prevAuthRef.current = clientAuth;

    if (!shouldUpgradeAfterLogin && !shouldDowngradeAfterLogout) return;

    let cancelled = false;

    (async () => {
      try {
        await ProjectData.initialize({
          disableCache: true,
          includeNdaInActive,
        });
      } catch {
        return;
      }

      if (cancelled) return;
    })();

    return () => {
      cancelled = true;
    };
  }, [
    allowNda,
    clientAuth,
    hasInitialized,
    includeNdaInActive,
    params.projectId,
    ssrContainsSanitizedPlaceholders,
  ]);

  void didHydrateFromSsr;

  return (
    <ProjectViewRouterBridge
      initialProjectId={params.projectId}
      allowNda={Boolean(allowNda)}
      clientBootstrapPending={clientBootstrapPending}
    />
  );
}

function ProjectViewRouterBridge({
  initialProjectId,
  allowNda,
  clientBootstrapPending,
}: {
  initialProjectId: string;
  allowNda: boolean;
  clientBootstrapPending: boolean;
}) {
  const [projectId] = useProjectUrlSync(initialProjectId);
  // Shareable/canonical URLs follow the current carousel context.
  // - Public carousel (allowNda=false): /project/
  // - NDA-included carousel (allowNda=true): /nda-included/
  const base = allowNda ? "/nda-included/" : "/project/";

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

  if (
    clientBootstrapPending &&
    !(ProjectData.activeProjectsRecord || {})[projectId]
  ) {
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
        <h2>Loading project…</h2>
      </div>
    );
  }

  // While we’re ensuring NDA dataset, avoid rendering a confusing "Project not found".
  if (
    allowNda &&
    projectId &&
    !(ProjectData.activeProjectsRecord || {})[projectId]
  ) {
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
        <h2>Loading confidential project…</h2>
      </div>
    );
  }

  // Use datasetEpoch from parent and local epoch to force remounts when data shape changes
  return (
    <>
      {/* Emit a canonical link that always points to the segment route for the current project */}
      <CanonicalLink href={`${base}${encodeURIComponent(projectId)}/`} />
      <ProjectView projectId={projectId} allowNda={allowNda} />
    </>
  );
}
