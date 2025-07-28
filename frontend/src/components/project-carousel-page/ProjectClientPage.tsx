"use client";

import { useRouter } from "next/navigation";
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
import DeviceDisplay, {
  DeviceTypes,
} from "@/components/project-carousel-page/DeviceDisplay";
import InfoSwapper from "@/components/project-carousel-page/InfoSwapper";
import LayeredCarouselManager from "@/components/project-carousel-page/LayeredCarouselManager";
import LogoSwapper from "@/components/project-carousel-page/LogoSwapper";
import PageButtons from "@/components/project-carousel-page/PageButtons";
import ProjectData from "@/data/ProjectData";

import styles from "./ProjectClientPage.module.scss";

/**
 * Handles bidirectional nature of the interaction between the dynamic route and
 * the carousel. When the carousel is the source of the change, the route is updated,
 * and when the route is the source of the change, the carousel is updated. The changes
 * then propagate to the rest of the components.
 *
 * @author Bradley Baysinger
 * @since The beginning of time.
 * @version N/A
 */
const ProjectClientPage: React.FC<{ projectId: string }> = ({ projectId }) => {
  // const { projectId = "" } = useParams<{ projectId: string }>();
  const projects = ProjectData.activeProjectsRecord;
  const [initialIndex] = useState<number | null>(() => {
    return projectId ? (ProjectData.projectIndex(projectId) ?? null) : null;
  });
  const [stabilizedIndex, setStabilizedIndex] = useState<number | null>(
    () => initialIndex,
  );
  const stabilizationTimer = useRef<NodeJS.Timeout | null>(null);
  const sourceRef = useRef<SourceType>(Source.NATURAL);
  const directionRef = useRef<DirectionType>(Direction.LEFT);
  const lastKnownProjectId = useRef(projectId);
  const carouselRef = useRef<{ scrollToSlide: (targetIndex: number) => void }>(
    null,
  );

  const router = useRouter();
  const isCarouselSourceRef = useRef(false);

  const brandId = useMemo(
    () => projects[projectId]?.brandId,
    [projects, projectId],
  );

  const infoSwapperIndex = useMemo(() => stabilizedIndex, [stabilizedIndex]);

  const slideDirectionClass = useMemo(() => {
    return directionRef.current === Direction.LEFT
      ? "bbSlideLeft"
      : "bbSlideRight";
  }, []);

  const laptopSlides = useMemo(
    () =>
      ProjectData.activeProjects.map((project) => (
        <DeviceDisplay
          deviceType={DeviceTypes.LAPTOP}
          id={project.id}
          key={project.id}
        />
      )),
    [],
  );

  const phoneSlides = useMemo(
    () =>
      ProjectData.activeProjects.map((project) => (
        <DeviceDisplay
          deviceType={DeviceTypes.PHONE}
          mobileStatus={project.mobileStatus}
          id={project.id}
          key={project.id}
        />
      )),
    [],
  );

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
          source === Source.NATURAL
        ) {
          // router.push(`/project-view/${newProjectId}`, { state: { shallow: true } });
          router.push(`/project-view/${newProjectId}`);
          lastKnownProjectId.current = newProjectId;
        }

        clearTimeout(stabilizationTimer.current as NodeJS.Timeout);

        sourceRef.current = source;
        directionRef.current = direction;
        setStabilizedIndex(newStabilizedIndex);
      }
    },
    [stabilizedIndex, projects, router],
  );

  useEffect(() => {
    lastKnownProjectId.current = projectId;
  }, [projectId]);

  useEffect(() => {
    if (carouselRef.current && projects[projectId]) {
      const targetIndex = ProjectData.projectIndex(projectId);

      if (stabilizedIndex !== targetIndex) {
        if (!isCarouselSourceRef.current) {
          carouselRef.current.scrollToSlide(targetIndex);
        }
      }
    }

    isCarouselSourceRef.current = false;
  }, [projectId, projects, stabilizedIndex]);

  return (
    <div className={styles.projectsPresentation}>
      <HeaderSub
        head={projects[projectId]?.title || "Unknown Project"}
        subhead={projects[projectId]?.tags?.join(", ") || ""}
      />
      <div
        id="project" // Page anchor, NOT for CSS selection.
        className={`${styles.projectsPresentationBody} ${slideDirectionClass}`}
      >
        <LogoSwapper projectId={brandId} />
        <div className={styles.carouselControlWrapper}>
          {initialIndex !== null && (
            <LayeredCarouselManager
              ref={carouselRef}
              layer1Slides={laptopSlides}
              layer2Slides={phoneSlides}
              onStabilizationUpdate={handleStabilizationUpdate}
              initialIndex={initialIndex}
            />
          )}
          <PageButtons />
        </div>
        <InfoSwapper index={infoSwapperIndex} />
      </div>
    </div>
  );
};

export default ProjectClientPage;
