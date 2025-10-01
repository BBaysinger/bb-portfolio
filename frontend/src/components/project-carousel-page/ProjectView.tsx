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
  Direction,
  SourceType,
  Source,
} from "@/components/project-carousel-page/CarouselTypes";
import InfoSwapper from "@/components/project-carousel-page/InfoSwapper";
import { LayeredCarouselManagerRef } from "@/components/project-carousel-page/LayeredCarouselManager";
import LogoSwapper from "@/components/project-carousel-page/LogoSwapper";
import PageButtons from "@/components/project-carousel-page/PageButtons";
import ProjectData from "@/data/ProjectData";

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
 * @author Bradley Baysinger
 * @since 2025
 */
const ProjectView: React.FC<{ projectId: string }> = ({ projectId }) => {
  const projects = ProjectData.activeProjectsRecord;

  const [initialIndex] = useState(() => {
    return projectId ? (ProjectData.projectIndex(projectId) ?? null) : null;
  });

  const [stabilizedIndex, setStabilizedIndex] = useState<number | null>(
    () => initialIndex,
  );

  const stabilizationTimer = useRef<NodeJS.Timeout | null>(null);
  const sourceRef = useRef<SourceType>(Source.SCROLL);
  const directionRef = useRef<DirectionType>(Direction.LEFT);
  const lastKnownProjectId = useRef(projectId);
  const carouselRef = useRef<LayeredCarouselManagerRef>(null);
  const isCarouselSourceRef = useRef(false);

  const brandId = useMemo(
    () => projects[projectId]?.brandId ?? "",
    [projects, projectId],
  );

  const infoSwapperIndex = useMemo(() => stabilizedIndex, [stabilizedIndex]);

  const slideDirectionClass = useMemo(() => {
    return directionRef.current === Direction.LEFT
      ? "bbSlideLeft"
      : "bbSlideRight";
  }, []); // Static based on current pattern

  const handleStabilizationUpdate = useCallback(
    (
      newStabilizedIndex: number,
      source: SourceType,
      direction: DirectionType,
    ) => {
      if (stabilizedIndex !== newStabilizedIndex) {
        isCarouselSourceRef.current = true;

        const newProjectId = Object.keys(projects).find(
          (key) => ProjectData.projectIndex(key) === newStabilizedIndex,
        );

        if (
          newProjectId &&
          newProjectId !== lastKnownProjectId.current &&
          source === Source.SCROLL
        ) {
          // Mark this navigation as originating from the carousel so we can
          // suppress the subsequent route-driven programmatic scroll.
          try {
            const state = {
              ...(window.history.state || {}),
              source: "carousel",
              projectId: newProjectId,
              ts: Date.now(),
            };
            window.history.pushState(
              state,
              "",
              `/project-view/${newProjectId}`,
            );
          } catch {
            // Fallback if history.state is not accessible for any reason
            window.history.pushState(
              { source: "carousel" },
              "",
              `/project-view/${newProjectId}`,
            );
          }
          lastKnownProjectId.current = newProjectId;
        }

        clearTimeout(stabilizationTimer.current as NodeJS.Timeout);

        sourceRef.current = source;
        directionRef.current = direction;
        setStabilizedIndex(newStabilizedIndex);
      }
    },
    [stabilizedIndex, projects],
  );

  useEffect(() => {
    lastKnownProjectId.current = projectId;
  }, [projectId]);

  useEffect(() => {
    if (carouselRef.current && projects[projectId]) {
      const targetIndex = ProjectData.projectIndex(projectId);

      // If the route change was initiated by the carousel (gesture), skip
      // programmatic scrolling to avoid a duplicate slide and wrong index.
      const routeFromCarousel =
        typeof window !== "undefined" &&
        !!(window.history?.state && window.history.state.source === "carousel");

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
    if (
      typeof window !== "undefined" &&
      window.history?.state?.source === "carousel"
    ) {
      try {
        const { source, ...rest } = window.history.state || {};
        window.history.replaceState(rest, "", window.location.href);
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
        className={`${styles.projectsPresentationBody} ${slideDirectionClass}`}
      >
        <LogoSwapper projectId={brandId} />
        <div className={styles.carouselControlsWrapper}>
          {initialIndex !== null && (
            <ProjectCarouselView
              refObj={carouselRef}
              initialIndex={initialIndex}
              projectId={projectId}
              onStabilizationUpdate={handleStabilizationUpdate}
            />
          )}
          <PageButtons />
        </div>
        <InfoSwapper index={infoSwapperIndex} />
      </div>
    </div>
  );
};

export default ProjectView;
