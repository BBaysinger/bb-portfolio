"use client";

import React, {
  useRef,
  useState,
  useEffect,
  useMemo,
  useCallback,
} from "react";

import HeaderSub from "@/components/layout/HeaderSub";
import {
  DirectionType,
  SlideDirection,
  SourceType,
  Source,
} from "@/components/project-carousel-page/CarouselTypes";
import InfoSwapper from "@/components/project-carousel-page/InfoSwapper";
import { LayeredCarouselManagerRef } from "@/components/project-carousel-page/LayeredCarouselManager";
import LogoSwapper from "@/components/project-carousel-page/LogoSwapper";
import PageButtons from "@/components/project-carousel-page/PageButtons";
import ProjectData from "@/data/ProjectData";
import { useRouteChange } from "@/hooks/useRouteChange";
import {
  navigateWithPushState,
  replaceWithReplaceState,
} from "@/utils/navigation";

import ProjectCarouselView from "./ProjectCarouselView";
import styles from "./ProjectView.module.scss";

/**
 * Main component for rendering a project carousel view.
 *
 * This component synchronizes between the carousel and the current route-driven project ID.
 * - If the route changes, the carousel scrolls to the corresponding project.
 * - If the carousel is the source of change (via user scrolling), the route is updated via `pushState`.
 *
 * The actual scroll position is decoupled from the route. It is only updated once carousel inertia completes
 * and `onStabilizationUpdate` is called.
 *
 * @component ProjectView
 * @param {string} projectId - The current project ID from the wrapper component.
 */
const ProjectView: React.FC<{ projectId: string }> = ({ projectId }) => {
  const projects = ProjectData.activeProjectsRecord;
  const debug = process.env.NEXT_PUBLIC_DEBUG_CAROUSEL === "1";

  const [initialIndex] = useState(() => {
    return projectId ? (ProjectData.projectIndex(projectId) ?? null) : null;
  });

  const [stabilizedIndex, setStabilizedIndex] = useState<number | null>(
    () => initialIndex,
  );

  const stabilizationTimer = useRef<NodeJS.Timeout | null>(null);
  const sourceRef = useRef<SourceType>(Source.SCROLL);
  const directionRef = useRef<DirectionType>(SlideDirection.LEFT);
  const lastKnownProjectId = useRef(projectId);
  const carouselRef = useRef<LayeredCarouselManagerRef>(null);
  const isCarouselSourceRef = useRef(false);
  // Tracks the most recent timestamp we wrote into history.state for a carousel-originated push.
  // Used to distinguish immediate same-tick route updates from older history entries navigated via Back/Forward.
  const lastCarouselPushTsRef = useRef<number | null>(null);
  // Capture the exact ordered key list used to build the slides at mount time.
  // This prevents index→slug mismatches if the active project set changes later
  // (e.g., NDA projects added post-auth) without rebuilding the carousel layers.
  const slideKeysRef = useRef<string[]>(
    ProjectData.activeProjects.map((p) => p.id),
  );

  // Debug: dump the index→slug mapping used by the carousel slides at mount
  useEffect(() => {
    if (debug) {
      try {
        console.info(
          "[Carousel] slideKeysRef (index→slug):",
          slideKeysRef.current,
        );
      } catch {}
    }
  }, [debug]);

  const infoSwapperIndex = useMemo(() => stabilizedIndex, [stabilizedIndex]);

  // React state to propagate the most recent slide direction to children and CSS
  const [uiDirection, setUiDirection] = useState<DirectionType>(
    SlideDirection.LEFT,
  );

  // No need to memoize a tiny string; we'll inline `bb${uiDirection}` where used.

  // Routing model notes (do not remove):
  // - Canonical entry from the list: segment URLs (/project/{slug} or /nda/{slug}).
  // - In-session navigation (carousel gestures + prev/next): query-string ?p={slug}.
  //   We normalize on first stabilization by converting any segment entry into ?p=
  //   and dispatch bb:routechange so all listeners stay consistent.
  // - This hook listens external-only (bb:routechange, popstate, hashchange) to avoid
  //   Next's internal noise; it also falls back to parsing the last path segment when
  //   ?p is absent so both URL styles are handled.
  // Listen for route changes (external/custom) and keep lastKnownProjectId in sync
  useRouteChange(
    (_pathname, search) => {
      const p = new URLSearchParams(search).get("p") || "";
      // Fallback to segment when ?p is absent
      const seg = (() => {
        try {
          const segs = (window.location.pathname || "")
            .split("/")
            .filter(Boolean);
          return segs.length >= 2 &&
            (segs[0] === "project" || segs[0] === "nda")
            ? segs[1]
            : "";
        } catch {
          return "";
        }
      })();
      const next = p || seg;
      if (next && next !== lastKnownProjectId.current) {
        lastKnownProjectId.current = next;
      }
    },
    // Prefer external-only: our PushState and ReplaceState dispatch bb:routechange
    // which this listener will receive, and we avoid internal Next noise.
    { mode: "external-only" },
  );

  const handleStabilizationUpdate = useCallback(
    (
      newStabilizedIndex: number,
      source: SourceType,
      direction: DirectionType,
    ) => {
      if (debug) {
        try {
          console.info("[Carousel] onStabilizationUpdate", {
            newStabilizedIndex,
            source,
            direction,
            lastKnown: lastKnownProjectId.current,
          });
        } catch {}
      }
      // Canonicalize segment entry to query once per mount for in-session navigation
      if (!canonicalizedRef.current) {
        try {
          const searchNow =
            typeof window !== "undefined" ? window.location.search : "";
          const hasQuery = new URLSearchParams(searchNow).has("p");
          if (!hasQuery && typeof window !== "undefined") {
            const path = window.location.pathname || "";
            const segs = path.split("/").filter(Boolean);
            const seg0 = segs[0];
            const seg1 = segs[1];
            const currentId = lastKnownProjectId.current;
            if ((seg0 === "project" || seg0 === "nda") && seg1 && currentId) {
              const base = `/${seg0}/`;
              const hash = window.location.hash || "";
              const url = `${base}?p=${encodeURIComponent(currentId)}${hash}`;
              replaceWithReplaceState(url, window.history.state || null);
            }
          }
        } catch {
          // ignore if not in browser
        } finally {
          canonicalizedRef.current = true;
        }
      }
      if (stabilizedIndex !== newStabilizedIndex) {
        isCarouselSourceRef.current = true;

        // Map stabilized slide index directly to the active key list.
        // Previous implementation iterated over Object.keys(projects) + projectIndex,
        // which is order-unsafe because object key enumeration doesn't guarantee
        // the same sequencing as the activeProjects array. Use activeKeys instead.
        const keys = slideKeysRef.current;
        const newProjectId =
          newStabilizedIndex >= 0 && newStabilizedIndex < keys.length
            ? keys[newStabilizedIndex]
            : undefined;
        if (debug) {
          try {
            console.info("[Carousel] index→slug", {
              newStabilizedIndex,
              resolvedSlug: newProjectId,
              keysSample: keys.slice(0, 6),
            });
          } catch {}
        }

        if (
          newProjectId &&
          newProjectId !== lastKnownProjectId.current &&
          source === Source.SCROLL
        ) {
          // In-session navigation MUST use query-string routes; do not change segments here.
          // Why push here (plain English):
          // - When we call pushState during the user's actual click/gesture,
          //   browsers record it as a normal navigation step, so Back/Forward stops on it.
          // - If we wait and push later (after timers/async), some browsers may merge/skip it.
          // Clicking into the carousel is a real click, so pushing now yields predictable history.
          const target = projects[newProjectId];
          const hrefBase = target?.nda ? "/nda/" : "/project/";
          // Carousel-initiated routes should use query-string model
          const targetHref = `${hrefBase}?p=${encodeURIComponent(newProjectId)}`;
          // Mark this navigation as originating from the carousel so we can
          // suppress the subsequent route-driven programmatic scroll.
          try {
            const state = {
              ...(window.history.state || {}),
              source: "carousel",
              projectId: newProjectId,
              ts: Date.now(),
            };
            lastCarouselPushTsRef.current = state.ts as number;
            if (debug) {
              try {
                console.info("[Carousel] navigateWithPushState", {
                  targetHref,
                  state,
                });
              } catch {}
            }
            navigateWithPushState(targetHref, state, {
              // Force unique history entries using a timestamp hash token (proven to work with buttons)
              useHashHistory:
                process.env.NEXT_PUBLIC_FORCE_HASH_HISTORY === "1",
              hashParam: "ts",
              hashValue: Date.now(),
              // Enable double-push fallback for gesture reliability if env flag is set
              useDoublePushFallback:
                process.env.NEXT_PUBLIC_DOUBLE_PUSH === "1",
            });
          } catch {
            // Fallback if history.state is not accessible for any reason
            navigateWithPushState(
              targetHref,
              {
                source: "carousel",
              },
              {
                useHashHistory:
                  process.env.NEXT_PUBLIC_FORCE_HASH_HISTORY === "1",
                hashParam: "ts",
                hashValue: Date.now(),
                useDoublePushFallback:
                  process.env.NEXT_PUBLIC_DOUBLE_PUSH === "1",
              },
            );
            lastCarouselPushTsRef.current =
              typeof Date.now === "function" ? Date.now() : null;
          }
          lastKnownProjectId.current = newProjectId;
        }

        clearTimeout(stabilizationTimer.current as NodeJS.Timeout);

        sourceRef.current = source;
        directionRef.current = direction;
        setUiDirection(direction);
        setStabilizedIndex(newStabilizedIndex);
      }
    },
    [stabilizedIndex, projects],
  );

  // On first stabilization after mount, canonicalize segment entry to query ?p=
  const canonicalizedRef = useRef(false);

  useEffect(() => {
    lastKnownProjectId.current = projectId;
  }, [projectId]);

  useEffect(() => {
    if (carouselRef.current && projects[projectId]) {
      // If the current stabilized slide already corresponds to the projectId from the URL,
      // do nothing. This prevents a bounce-back when a carousel-originated navigation
      // updates the URL and React cycles before `projectId` settles.
      const currentSlugFromIndex =
        stabilizedIndex != null && stabilizedIndex >= 0
          ? (slideKeysRef.current[stabilizedIndex] as string | undefined)
          : undefined;
      if (debug) {
        try {
          console.info("[Carousel] route→scroll check", {
            projectId,
            stabilizedIndex,
            currentSlugFromIndex,
          });
        } catch {}
      }
      if (currentSlugFromIndex && currentSlugFromIndex === projectId) {
        // Clear one-shot flags and consume marker if present, then bail.
        isCarouselSourceRef.current = false;
        // Only consume marker if it refers to our most recent carousel push; keep older entries intact for Back/Forward behavior.
        if (
          typeof window !== "undefined" &&
          window.history?.state?.source === "carousel" &&
          (lastCarouselPushTsRef.current == null ||
            window.history.state?.ts === lastCarouselPushTsRef.current)
        ) {
          try {
            const { source: _s, ...rest } = window.history.state || {};
            const currentUrl =
              window.location.pathname +
              window.location.search +
              window.location.hash; // preserve hash tokens used for history separation
            replaceWithReplaceState(
              currentUrl,
              rest as Record<string, unknown>,
            );
          } catch {}
        }
        return;
      }
      const targetIndex = ProjectData.projectIndex(projectId);
      if (debug) {
        try {
          console.info("[Carousel] route→scroll action", {
            projectId,
            targetIndex,
            stabilizedIndex,
            isCarouselSource: isCarouselSourceRef.current,
            routeFromCarousel:
              typeof window !== "undefined" &&
              !!(
                window.history?.state &&
                window.history.state.source === "carousel"
              ),
          });
        } catch {}
      }

      // If the route change was initiated by the carousel (gesture), skip
      // programmatic scrolling to avoid a duplicate slide and wrong index.
      const routeFromCarousel =
        typeof window !== "undefined" &&
        !!(
          window.history?.state &&
          window.history.state.source === "carousel" &&
          // Treat as "from carousel" only if this entry matches the most recent push we created.
          (lastCarouselPushTsRef.current == null ||
            window.history.state.ts === lastCarouselPushTsRef.current)
        );

      if (
        stabilizedIndex !== targetIndex &&
        !isCarouselSourceRef.current &&
        !routeFromCarousel
      ) {
        carouselRef.current.scrollToSlide(targetIndex);
      }
    }

    // Clear one-shot flags after handling this effect
    isCarouselSourceRef.current = false;

    // Consume and clear the route-from-carousel marker so future route
    // changes behave normally.
    // Consume marker only if it matches the most recent carousel push; otherwise,
    // leave older entries as-is so Back/Forward stays meaningful.
    if (
      typeof window !== "undefined" &&
      window.history?.state?.source === "carousel" &&
      (lastCarouselPushTsRef.current == null ||
        window.history.state?.ts === lastCarouselPushTsRef.current)
    ) {
      try {
        const { source: _source, ...rest } = window.history.state || {};
        // Preserve full current URL including hash used for history entry uniqueness
        const currentUrl =
          window.location.pathname +
          window.location.search +
          window.location.hash;
        replaceWithReplaceState(currentUrl, rest as Record<string, unknown>);
      } catch {
        // noop if replaceState fails
      }
    }
  }, [projectId, projects, stabilizedIndex]);

  if (!projectId || !projects[projectId]) {
    return <div>Project not found.</div>;
  }

  return (
    <div className={styles.projectsPresentation}>
      <HeaderSub
        head={projects[projectId]?.title || "Unknown Project"}
        subhead={projects[projectId]?.tags?.join(", ") || ""}
      />
      <div
        id="project"
        className={`${styles.projectsPresentationBody} bb${uiDirection}`}
      >
        <LogoSwapper index={infoSwapperIndex ?? undefined} />
        <div className={styles.carouselControlsWrapper}>
          {initialIndex !== null && (
            <ProjectCarouselView
              refObj={carouselRef}
              initialIndex={initialIndex}
              projectId={projectId}
              onStabilizationUpdate={handleStabilizationUpdate}
            />
          )}
          <PageButtons projectId={projectId} />
        </div>
        <InfoSwapper index={infoSwapperIndex} direction={uiDirection} />
      </div>
    </div>
  );
};

export default ProjectView;
