"use client";

import clsx from "clsx";
import React, { useRef, useState, useEffect, useMemo } from "react";

import HeaderSub from "@/components/layout/HeaderSub";
import {
  DirectionType,
  SlideDirection,
} from "@/components/project-carousel-page/carousel-core/CarouselTypes";
import { LayeredCarouselManagerRef } from "@/components/project-carousel-page/carousel-core/LayeredCarouselManager";
import InfoSwapper from "@/components/project-carousel-page/InfoSwapper";
import LogoSwapper from "@/components/project-carousel-page/LogoSwapper";
import PageButtons from "@/components/project-carousel-page/PageButtons";
import ProjectData from "@/data/ProjectData";
import { useProjectDataVersion } from "@/hooks/useProjectDataVersion";
import { useProjectSelectionController } from "@/hooks/useProjectSelectionController";
import { replaceWithReplaceState } from "@/utils/navigation";

import ProjectCarouselView from "./carousel-core/ProjectCarouselView";
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
const ProjectView: React.FC<{ projectId: string; allowNda?: boolean }> = ({
  projectId,
  allowNda,
}) => {
  // Re-render when ProjectData changes so placeholders can upgrade in-place.
  const projectDataVersion = useProjectDataVersion();

  const projects = ProjectData.activeProjectsRecord;

  useEffect(() => {
    try {
      const rec = projects?.[projectId];
      const title = rec?.longTitle || rec?.title || "Project";
      document.title = title;
    } catch {
      // ignore
    }
  }, [projectId, projects]);

  const [slideKeys, setSlideKeys] = useState<string[]>(() =>
    ProjectData.activeProjects.map((project) => project.id),
  );

  const [initialIndex, setInitialIndex] = useState<number | null>(() => {
    if (!projectId) return null;
    const idx = ProjectData.projectIndex(projectId);
    return typeof idx === "number" && idx >= 0 ? idx : null;
  });

  const [stabilizedIndex, setStabilizedIndex] = useState<number | null>(
    () => initialIndex,
  );

  const carouselRef = useRef<LayeredCarouselManagerRef>(null);
  const slideKeysModeRef = useRef<boolean | null>(null);

  useEffect(() => {
    void projectDataVersion;

    const desiredMode = Boolean(allowNda);
    const datasetHasCurrent = (() => {
      try {
        return Boolean(ProjectData.activeProjectsRecord?.[projectId]);
      } catch {
        return false;
      }
    })();
    const keysHaveCurrent = slideKeys.includes(projectId);
    const nextKeys = ProjectData.activeProjects.map((project) => project.id);

    const shouldResetKeys =
      slideKeys.length === 0 ||
      slideKeysModeRef.current !== desiredMode ||
      (datasetHasCurrent && !keysHaveCurrent);

    if (!shouldResetKeys && initialIndex !== null) return;
    if (nextKeys.length === 0) return;

    const nextIndex = (() => {
      if (!projectId) return null;
      const idx = nextKeys.indexOf(projectId);
      return idx >= 0 ? idx : null;
    })();

    const frameId = window.requestAnimationFrame(() => {
      if (shouldResetKeys) {
        slideKeysModeRef.current = desiredMode;
        setSlideKeys(nextKeys);
      }

      if (nextIndex !== null) {
        setInitialIndex(nextIndex);
        setStabilizedIndex((currentIndex) => currentIndex ?? nextIndex);
      }
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [projectId, projectDataVersion, allowNda, initialIndex, slideKeys]);

  const displayIndex = stabilizedIndex ?? initialIndex;

  const infoSwapperIndex = useMemo(() => stabilizedIndex, [stabilizedIndex]);

  // React state to propagate the most recent slide direction to children and CSS
  const [uiDirection, setUiDirection] = useState<DirectionType>(
    SlideDirection.LEFT,
  );

  const {
    handleReady,
    handleStabilizationUpdate,
    isCarouselSourceRef,
    didFirstStabilizeRef,
    lastCarouselPushTsRef,
  } = useProjectSelectionController({
    projectId,
    allowNda,
    slideKeys,
    stabilizedIndex,
    setStabilizedIndex,
    setUiDirection,
  });

  // No need to memoize a tiny string; we'll inline `bb${uiDirection}` where used.

  useEffect(() => {
    if (carouselRef.current && projects[projectId]) {
      // If the current stabilized slide already corresponds to the projectId from the URL,
      // do nothing. This prevents a bounce-back when a carousel-originated navigation
      // updates the URL and React cycles before `projectId` settles.
      const currentSlugFromIndex =
        displayIndex != null && displayIndex >= 0
          ? (slideKeys[displayIndex] as string | undefined)
          : undefined;
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
      // If the carousel hasn't reported its first stabilization yet, avoid any
      // programmatic scrolls to prevent an initial visual jerk.
      if (!didFirstStabilizeRef.current) {
        return;
      }
      const targetIndex = ProjectData.projectIndex(projectId);
      if (typeof targetIndex !== "number" || targetIndex < 0) {
        return;
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
        displayIndex !== targetIndex &&
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
  }, [
    projectId,
    projects,
    displayIndex,
    slideKeys,
    didFirstStabilizeRef,
    isCarouselSourceRef,
    lastCarouselPushTsRef,
  ]);

  if (!projectId || !projects[projectId]) {
    return <div>Project not found.</div>;
  }

  return (
    <div
      className={styles.projectsPresentation}
      role="region"
      aria-label={
        projects[projectId]?.title
          ? `Project carousel: ${projects[projectId].title}`
          : "Project carousel"
      }
      tabIndex={0}
    >
      <div
        id="project"
        className={clsx(styles.projectsPresentationBody, `bb${uiDirection}`)}
      >
        <HeaderSub
          head={
            projects[projectId]?.shortTitle ||
            projects[projectId]?.title ||
            "Unknown Project"
          }
          subhead={projects[projectId]?.tags?.join(", ") || ""}
        />
        <div className={styles.carouselControlsWrapper}>
          {initialIndex !== null && (
            <ProjectCarouselView
              refObj={carouselRef}
              initialIndex={initialIndex}
              projectId={projectId}
              onReady={handleReady}
              onStabilizationUpdate={handleStabilizationUpdate}
            />
          )}
          <PageButtons projectId={projectId} allowNda={allowNda} />
        </div>
        <LogoSwapper
          index={infoSwapperIndex ?? undefined}
          slideKeys={slideKeys}
        />
        <InfoSwapper
          index={infoSwapperIndex}
          direction={uiDirection}
          slideKeys={slideKeys}
        />
      </div>
    </div>
  );
};

export default ProjectView;
