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
import { useRouteChange } from "@/hooks/useRouteChange";

import ProjectCarouselView from "./ProjectCarouselView";
import styles from "./ProjectView.module.scss";

/**
 * Handles bidirectional nature of the interaction between the dynamic route and
 * the carousel. When the carousel is the source of the change, the route is updated,
 * and when the route is the source of the change, the carousel is updated. The changes
 * then propagate to the rest of the components.
 *
 * @component ProjectView
 * @author Bradley Baysinger
 * @since 2025
 */
const ProjectView: React.FC<{ projectId: string }> = ({ projectId }) => {
  const projects = ProjectData.activeProjectsRecord;

  const [initialIndex] = useState<number | null>(() => {
    return projectId ? (ProjectData.projectIndex(projectId) ?? null) : null;
  });

  const [stabilizedIndex, setStabilizedIndex] = useState<number | null>(
    () => initialIndex,
  );

  const stabilizationTimer = useRef<NodeJS.Timeout | null>(null);
  const sourceRef = useRef<SourceType>(Source.SCROLL);
  const directionRef = useRef<DirectionType>(Direction.LEFT);
  const lastKnownProjectId = useRef(projectId ?? "");
  const carouselRef = useRef<LayeredCarouselManagerRef>(null);

  const isCarouselSourceRef = useRef(false);

  const brandId = useMemo(
    () => (projectId && projects[projectId]?.brandId) ?? "",
    [projects, projectId],
  );

  const infoSwapperIndex = useMemo(() => stabilizedIndex, [stabilizedIndex]);

  const slideDirectionClass = useMemo(() => {
    return directionRef.current === Direction.LEFT
      ? "bbSlideLeft"
      : "bbSlideRight";
  }, []);

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
          // router.push(`/project-view/${newProjectId}`, { scroll: false });
          window.history.pushState({}, "", `/project-view/${newProjectId}`);
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
    console.log("asdf", carouselRef.current, projects[projectId]);
    if (carouselRef.current && projects[projectId]) {
      const targetIndex = ProjectData.projectIndex(projectId);

      console.log("Attempting scroll to index:", targetIndex, "for", projectId);
      if (stabilizedIndex !== targetIndex) {
        if (!isCarouselSourceRef.current) {
          carouselRef.current.scrollToSlide(targetIndex);
        }
      }
    }

    isCarouselSourceRef.current = false;
  }, [projectId, projects, stabilizedIndex]);

  useRouteChange((pathname) => {
    const newProjectId = pathname.split("/").pop() ?? "";
    const newIndex = ProjectData.projectIndex(newProjectId);

    if (
      newProjectId &&
      newIndex != null &&
      newProjectId !== lastKnownProjectId.current
    ) {
      lastKnownProjectId.current = newProjectId;
      sourceRef.current = Source.ROUTE;
      directionRef.current =
        newIndex < (stabilizedIndex ?? 0) ? Direction.LEFT : Direction.RIGHT;

      if (carouselRef.current) {
        carouselRef.current.scrollToSlide(newIndex);
      }

      setStabilizedIndex(newIndex);
    }
  });

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
