import React, { useRef, useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

import HeaderSub from "components/layout/HeaderSub";
import InfoSwapper from "components/project-carousel-page/InfoSwapper";
import ProjectData from "data/ProjectData";
import LogoSwapper from "components/project-carousel-page/LogoSwapper";
import ProjectParallaxCarousel from "components/project-carousel-page/ProjectParallaxCarousel";
import {
  DirectionType,
  Direction,
} from "components/project-carousel-page/Carousel";
import DeviceDisplay, {
  DeviceTypes,
} from "components/project-carousel-page/DeviceDisplay";
import PageButtons from "components/project-carousel-page/PageButtons";
import styles from "./ProjectsPresentation.module.scss";

const ProjectsPresentation: React.FC = () => {
  const { projectId = "" } = useParams<{ projectId: string }>();
  const projects = ProjectData.activeProjectsRecord;
  const [stabilizedIndex, setStabilizedIndex] = useState<number | null>(null);
  const [direction, setDirection] = useState<DirectionType | null>(
    Direction.LEFT,
  );
  const [initialIndex] = useState(() =>
    projectId && projects[projectId] ? projects[projectId].index : 0,
  );
  const carouselRef = useRef<{ scrollToSlide: (targetIndex: number) => void }>(
    null,
  );

  const navigate = useNavigate();
  const isCarouselSourceRef = useRef(false);

  const onDirectionChange = (direction: DirectionType) => {
    setDirection(direction);
  };

  const laptopSlides = ProjectData.activeProjects.map((project) => (
    <DeviceDisplay
      deviceType={DeviceTypes.LAPTOP}
      id={project.id}
      key={project.id}
    />
  ));

  const phoneSlides = ProjectData.activeProjects.map((project) => (
    <DeviceDisplay
      deviceType={DeviceTypes.PHONE}
      mobileStatus={project.mobileStatus}
      id={project.id}
      key={project.id}
    />
  ));

  const handleStableIndexUpdate = (index: number | null) => {
    if (stabilizedIndex !== index) {
      isCarouselSourceRef.current = true;

      const newProjectId = Object.keys(projects).find(
        (key) => projects[key].index === index,
      );

      if (newProjectId && newProjectId !== projectId) {
        navigate(`/portfolio/${newProjectId}`);
      }

      setStabilizedIndex(index);
    }
  };

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
        id={"project"}
        className={
          `${styles["projects-presentation-body"]} ` +
          `${direction === Direction.LEFT ? "bb-slide-left" : "bb-slide-right"}`
        }
      >
        <LogoSwapper projectId={projects[projectId]?.clientId} />
        <ProjectParallaxCarousel
          ref={carouselRef}
          layer1Slides={laptopSlides}
          layer2Slides={phoneSlides}
          onStableIndex={handleStableIndexUpdate}
          initialIndex={initialIndex}
          onDirectionChange={onDirectionChange}
        />
        <PageButtons />
        <InfoSwapper stabilizedIndex={stabilizedIndex} />
      </div>
    </div>
  );
};

export default ProjectsPresentation;
