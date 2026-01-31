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
  const router = useRouter();
  const { isLoggedIn, user } = useAppSelector((s) => s.auth);
  const isAuthed = Boolean(isLoggedIn) || Boolean(user);
  // Dataset selection:
  // - Public routes (/project/*): do NOT include NDA projects.
  // - NDA-included routes (/nda-included/*): include NDA placeholders and upgrade client-side if authed.
  const includeNdaInActive = Boolean(allowNda);

  // If authenticated and on the public project route, normalize into the NDA-included
  // route so navigation doesn't mix route bases.
  useEffect(() => {
    if (allowNda) return;
    if (!isAuthed) return;
    const id = (params?.projectId || "").trim();
    if (!id) return;
    router.replace(`/nda-included/${encodeURIComponent(id)}/`);
  }, [allowNda, isAuthed, params?.projectId, router]);

  // If the client store already has data in the correct mode, we can render
  // immediately without waiting for a network re-init.
  const clientStoreReady = (() => {
    try {
      const hasActive =
        Object.keys(ProjectData.activeProjectsRecord || {}).length > 0;
      if (!hasActive) return false;
      if (ProjectData.includeNdaInActive !== includeNdaInActive) return false;
      // On NDA routes, if we're authenticated but the current dataset is still
      // sanitized placeholders, we need to refresh to expand confidential fields.
      if (
        includeNdaInActive &&
        isAuthed &&
        ProjectData.containsSanitizedPlaceholders
      )
        return false;
      return true;
    } catch {
      return false;
    }
  })();

  // If an SSR snapshot is provided and it matches the desired dataset shape,
  // we can render immediately on the client.
  const [ready, setReady] = useState(
    () => Boolean(ssrParsed) || clientStoreReady,
  );

  const hydratedFromSsr = useRef(false);
  const lastConfiguredIncludeNdaRef = useRef<boolean | null>(null);

  // If SSR provided a parsed snapshot, hydrate synchronously once so the
  // carousel can render without waiting for an effect.
  if (ssrParsed && !hydratedFromSsr.current) {
    try {
      ProjectData.hydrate(
        ssrParsed,
        Boolean(ssrIncludeNdaInActive ?? includeNdaInActive),
        {
          containsSanitizedPlaceholders: ssrContainsSanitizedPlaceholders,
        },
      );
      hydratedFromSsr.current = true;
      lastConfiguredIncludeNdaRef.current = Boolean(
        ssrIncludeNdaInActive ?? includeNdaInActive,
      );
    } catch {
      // fall back to async init path
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Ensure SSR snapshot is applied (if provided) before deciding whether
        // we still need a client init.
        if (ssrParsed && !hydratedFromSsr.current) {
          try {
            ProjectData.hydrate(
              ssrParsed,
              Boolean(ssrIncludeNdaInActive ?? includeNdaInActive),
              {
                containsSanitizedPlaceholders: ssrContainsSanitizedPlaceholders,
              },
            );
            hydratedFromSsr.current = true;
            lastConfiguredIncludeNdaRef.current = Boolean(
              ssrIncludeNdaInActive ?? includeNdaInActive,
            );
          } catch {
            // ignore
          }
        }

        // If the global store already has the right dataset (e.g., user clicked
        // into an NDA route from an already-authenticated home session), do not
        // force a refetch.
        let storeReadyNow = false;
        try {
          const hasActive =
            Object.keys(ProjectData.activeProjectsRecord || {}).length > 0;
          storeReadyNow =
            hasActive && ProjectData.includeNdaInActive === includeNdaInActive;
          if (
            includeNdaInActive &&
            isAuthed &&
            ProjectData.containsSanitizedPlaceholders
          )
            storeReadyNow = false;

          // On NDA routes, SSR is static and will typically hydrate with sanitized
          // placeholders (no auth). Always attempt a client refresh on entry so we
          // can expand confidential fields if the browser has a session cookie,
          // even if the Redux auth state hasn't populated yet.
          if (allowNda && ssrContainsSanitizedPlaceholders) {
            storeReadyNow = false;
          }
        } catch {
          storeReadyNow = false;
        }

        if (storeReadyNow) {
          lastConfiguredIncludeNdaRef.current = includeNdaInActive;
          return;
        }

        await ProjectData.initialize({
          disableCache: true,
          includeNdaInActive,
        });
        lastConfiguredIncludeNdaRef.current = includeNdaInActive;
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    includeNdaInActive,
    allowNda,
    ssrIncludeNdaInActive,
    ssrParsed,
    ssrContainsSanitizedPlaceholders,
    isAuthed,
  ]);

  // On NDA routes, refresh the dataset when auth state changes so
  // placeholders can upgrade (or re-sanitize) without remounting.
  useEffect(() => {
    if (!ready) return;
    if (!allowNda) return;
    (async () => {
      try {
        // Only refresh when auth/data shape is mismatched.
        // - Logged in but still seeing sanitized placeholders => expand.
        // - Logged out but dataset isn't sanitized => re-sanitize.
        const mismatch =
          (isAuthed && ProjectData.containsSanitizedPlaceholders) ||
          (!isAuthed && !ProjectData.containsSanitizedPlaceholders);
        if (!mismatch) return;
        await ProjectData.initialize({
          disableCache: true,
          includeNdaInActive: true,
        });
      } catch {
        // ignore
      }
    })();
  }, [ready, allowNda, isAuthed]);

  // If we're on the public route but the slug actually refers to an NDA project,
  // redirect to the NDA route to ensure the dataset includes the project in the active set
  // and to avoid inconsistent rendering.
  useEffect(() => {
    if (!ready) return;
    if (allowNda) return;
    try {
      const p = ProjectData.getProject(params.projectId);
      if (projectRequiresNda(p)) {
        // Navigate to NDA-included route using shortCode (stable for SSG placeholder dataset)
        const code = (p?.shortCode || "").trim();
        router.replace(
          `/nda-included/${encodeURIComponent(code || params.projectId)}/`,
        );
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
    let probing = false;

    const probeAuthAndRefresh = async () => {
      if (probing) return;
      probing = true;
      try {
        // Don't rely on Redux auth state here; it's racy on client-side
        // transitions. Instead, probe the session cookie via /api/users/me.
        const hasPlaceholders = ProjectData.containsSanitizedPlaceholders;

        const me = await fetch("/api/users/me", {
          method: "GET",
          cache: "no-store",
          credentials: "include",
        });

        const sessionValid = me.ok;

        // - If session is valid but we have placeholders => expand.
        // - If session is invalid but we have expanded data => re-sanitize.
        const needsRefresh =
          (sessionValid && hasPlaceholders) ||
          (!sessionValid && !hasPlaceholders);

        if (!needsRefresh) return;

        await ProjectData.initialize({
          disableCache: true,
          includeNdaInActive: true,
        });
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
      window.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onFocus);
    };
  }, [ready, allowNda]);
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
  const [projectId] = useProjectUrlSync(initialProjectId, {
    fallbackFromPathSegment: true,
    // Hash uniquing removed; Back/Forward is stable without it in supported browsers.
  });
  // Shareable/canonical URLs follow the current carousel context.
  // - Public carousel (allowNda=false): /project/
  // - NDA-included carousel (allowNda=true): /nda-included/
  const base = allowNda ? "/nda-included/" : "/project/";
  // On NDA routes, include NDA items in active set even if not logged in (placeholders allowed).
  const includeNdaInActive = Boolean(allowNda);

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
        } catch {
          // ignore
        }
      }
    };
    ensureNdaPresent();
  }, [includeNdaInActive, projectId, allowNda]);

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
      <ProjectView projectId={projectId} allowNda={allowNda} />
    </>
  );
}
