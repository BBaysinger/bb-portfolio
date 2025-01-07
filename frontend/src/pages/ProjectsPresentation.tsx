import React, {
  useRef,
  useState,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import { useParams, useNavigate } from "react-router-dom";

import HeaderSub from "components/layout/HeaderSub";
import InfoSwapper from "components/project-carousel-page/InfoSwapper";
import ProjectData from "data/ProjectData";
import LogoSwapper from "components/project-carousel-page/LogoSwapper";
import ProjectParallaxCarousel from "components/project-carousel-page/ProjectParallaxCarousel";
import {
  DirectionType,
  Direction,
  SourceType,
  Source,
} from "components/project-carousel-page/Carousel";
import DeviceDisplay, {
  DeviceTypes,
} from "components/project-carousel-page/DeviceDisplay";
import PageButtons from "components/project-carousel-page/PageButtons";
import styles from "./ProjectsPresentation.module.scss";

const ProjectsPresentation: React.FC = () => {
  const { projectId = "" } = useParams<{ projectId: string }>();
  const projects = ProjectData.activeProjectsRecord;
  const [initialIndex] = useState<number | null>(() =>
    projectId && projects[projectId] ? projects[projectId].index : null,
  );
  const [stabilizedIndex, setStabilizedIndex] = useState<number | null>(
    () => initialIndex,
  );
  const stabilizationTimer = useRef<NodeJS.Timeout | null>(null);
  const sourceRef = useRef<SourceType>(Source.NATURAL);
  const directionRef = useRef<DirectionType>(Direction.LEFT);
  const carouselRef = useRef<{ scrollToSlide: (targetIndex: number) => void }>(
    null,
  );

  const navigate = useNavigate();
  const isCarouselSourceRef = useRef(false);

  const clientId = useMemo(
    () => projects[projectId]?.clientId,
    [projects, projectId],
  );

  const infoSwapperIndex = useMemo(() => stabilizedIndex, [stabilizedIndex]);

  const slideDirectionClass = useMemo(() => {
    return directionRef.current === Direction.LEFT
      ? "bb-slide-left"
      : "bb-slide-right";
  }, [stabilizedIndex]);

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
          (key) => projects[key].index === newStabilizedIndex,
        );

        if (
          newProjectId &&
          newProjectId !== projectId &&
          source === Source.NATURAL
        ) {
          // window.history.pushState({ shallow: true, id: newProjectId }, '', `/portfolio/${newProjectId}`);
          navigate(`/portfolio/${newProjectId}`, { state: { shallow: true } });
        }

        clearTimeout(stabilizationTimer.current as NodeJS.Timeout);

        sourceRef.current = source;
        directionRef.current = direction;
        setStabilizedIndex(newStabilizedIndex);
      }
    },
    [stabilizedIndex],
  );

  useEffect(() => {
    if (carouselRef.current && projects[projectId]) {
      const targetIndex = projects[projectId].index;

      if (stabilizedIndex !== targetIndex) {
        if (!isCarouselSourceRef.current) {
          carouselRef.current.scrollToSlide(targetIndex);
        }
      }
    }

    isCarouselSourceRef.current = false;
  }, [projectId, projects, stabilizedIndex]);

  return (
    <div className={styles["projects-presentation"]}>
      <HeaderSub
        head={projects[projectId]?.title || "Unknown Project"}
        subhead={projects[projectId]?.tags?.join(", ") || ""}
      />
      <div
        id="project" // Page anchor, NOT for CSS selection.
        className={`${styles["projects-presentation-body"]} ${slideDirectionClass}`}
      >
        <LogoSwapper projectId={clientId} />
        {initialIndex !== null && (
          <ProjectParallaxCarousel
            ref={carouselRef}
            layer1Slides={laptopSlides}
            layer2Slides={phoneSlides}
            onStabilizationUpdate={handleStabilizationUpdate}
            initialIndex={initialIndex}
          />
        )}
        <PageButtons />
        <InfoSwapper index={infoSwapperIndex} />
      </div>
    </div>
  );
};

export default ProjectsPresentation;
