"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import CanonicalLink from "@/components/common/CanonicalLink";
import ProjectView from "@/components/project-carousel-page/ProjectView";
import ProjectData, { projectRequiresNda } from "@/data/ProjectData";
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
  const router = useRouter();
  // If we were given an SSR snapshot, we can render immediately (client-only wrapper).
  // The page uses dynamic(..., { ssr: false }) so this code only runs in the browser.
  const [ready, setReady] = useState(Boolean(ssrParsed));
  // Increment this when the underlying ProjectData active set fundamentally changes
  // (e.g., NDA entries added after an includeNda initialization) so the carousel remounts.
  const [datasetEpoch, setDatasetEpoch] = useState(ssrParsed ? 1 : 0);
  const initOnce = useRef(false);
  const hydratedFromSsr = useRef(false);
  const { isLoggedIn, user } = useAppSelector((s) => s.auth);
  // Two-mode carousel:
  // - Public routes always omit NDA slides.
  // - NDA routes always include NDA in active set (placeholders when unauthenticated).
  void isLoggedIn;
  void user;
  const includeNdaInActive = Boolean(allowNda);

  // If SSR provided a parsed snapshot, hydrate synchronously once so the
  // carousel can render with all slides immediately on first client render.
  if (ssrParsed && !hydratedFromSsr.current) {
    try {
      ProjectData.hydrate(
        ssrParsed,
        Boolean(ssrIncludeNdaInActive ?? includeNdaInActive),
      );
      initOnce.current = true;
      hydratedFromSsr.current = true;
    } catch {
      // If hydration fails for any reason, fall back to the async init path.
      // Keep `ready` as-is; the effect below will fetch and then set ready.
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
        // If SSR provided a parsed snapshot, hydrate it first to avoid
        // a client refetch that could drop NDA fields due to cookie scoping.
        if (ssrParsed) {
          ProjectData.hydrate(
            ssrParsed,
            Boolean(ssrIncludeNdaInActive ?? includeNdaInActive),
          );
          setDatasetEpoch((e) => e + 1);
        } else {
          // Initialize dataset based on computed includeNdaInActive for this route/auth state.
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
        initOnce.current = true;
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [includeNdaInActive, ssrIncludeNdaInActive, ssrParsed]);

  // If we are on the public route and the user transitions to authenticated,
  // reinitialize the dataset to include NDA entries and bump the epoch so the
  // carousel remounts with the expanded set.
  // NOTE: We intentionally do not expand the public route dataset after login.
  // Public carousel should remain stable and omit NDA slides.

  // If we're on the public route but the slug actually refers to an NDA project,
  // redirect to the NDA route to ensure the dataset includes the project in the active set
  // and to avoid inconsistent rendering.
  useEffect(() => {
    if (!ready) return;
    if (allowNda) return;
    try {
      const p = ProjectData.getProject(params.projectId);
      if (projectRequiresNda(p)) {
        // Navigate to NDA route for this slug
        router.replace(`/nda/${encodeURIComponent(params.projectId)}/`);
      }
    } catch {
      // no-op
    }
  }, [ready, allowNda, params.projectId, router]);

  // NDA edge handling: probe auth status on entry/visibility/focus to refresh dataset
  // so confidential fields are sanitized immediately if auth flips during the session.
  useEffect(() => {
    if (!ready) return;
    if (!allowNda) return; // Only probe on NDA routes
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
        const _authed = resp.ok;
        // Regardless of auth outcome, reinitialize NDA dataset to ensure fields are
        // properly sanitized or expanded to match current auth state.
        await ProjectData.initialize({
          disableCache: true,
          includeNdaInActive: true,
        });
        if (!cancelled) {
          setDatasetEpoch((e) => e + 1);
        }
        // AppShell handles redirect on 401; this refresh keeps UI consistent while that happens.
      } catch {
        // Silently ignore network errors; dataset remains as-is.
      } finally {
        probing = false;
      }
    };

    // Initial probe on mount
    probeAuthAndRefresh();
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        probeAuthAndRefresh();
      }
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

  // Privacy redirect fallback: if we're on an NDA route and auth has dropped, navigate to home.
  // NOTE: We intentionally do NOT hard-redirect unauthenticated visitors away from NDA routes.
  // The NDA carousel uses sanitized placeholder data when unauthenticated and upgrades
  // after auth is confirmed client-side.

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
  const router = useRouter();
  const [projectId] = useProjectUrlSync(initialProjectId, {
    fallbackFromPathSegment: true,
    // Hash uniquing removed; Back/Forward is stable without it in supported browsers.
  });
  const base = allowNda ? "/nda/" : "/project/";
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
      const hasNdaInActive = ProjectData.activeProjects.some((p) =>
        projectRequiresNda(p),
      );
      if (!hasNdaInActive) {
        try {
          await ProjectData.initialize({
            disableCache: true,
            includeNdaInActive: true,
          });
          setEpoch((e) => e + 1);
        } catch {
          // ignore
        }
      }
    };
    ensureNdaPresent();
  }, [includeNdaInActive, projectId, allowNda]);

  // Canonical per project: if we're in the NDA carousel but the active project is public,
  // transition to the public route so the user isn't stuck under /nda/* for non-NDA projects.
  useEffect(() => {
    if (!allowNda) return;
    if (!projectId) return;
    try {
      const p = ProjectData.getProject(projectId);
      if (p && !projectRequiresNda(p)) {
        router.replace(`/project/${encodeURIComponent(projectId)}/`);
      }
    } catch {
      // ignore
    }
  }, [allowNda, projectId, router]);

  // URL sync is now handled entirely by useProjectUrlSync

  // If NDA is allowed but the current project isn't in the active map yet,
  // attempt a one-shot re-init including NDA and show a lightweight placeholder.
  useEffect(() => {
    const ensureCurrentPresent = async () => {
      if (!allowNda || !projectId) return;
      const record = ProjectData.activeProjectsRecord || {};
      if (!record[projectId]) {
        try {
          await ProjectData.initialize({
            disableCache: true,
            includeNdaInActive: true,
          });
          setEpoch((e) => e + 1);
        } catch {
          // ignore
        }
      }
    };
    ensureCurrentPresent();
  }, [allowNda, projectId]);

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
      <ProjectView
        key={`dataset-${datasetEpoch}-${epoch}`}
        projectId={projectId}
      />
    </>
  );
}
