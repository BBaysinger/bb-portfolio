import React, { useRef, useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

import HeaderSub from "components/layout/HeaderSub";
import ProjectContent from "components/project-carousel-page/ProjectContent";
import ProjectData from "data/ProjectData";
import LogoSwapper from "components/project-carousel-page/LogoSwapper";
import ProjectParallaxCarousel from "components/project-carousel-page/ProjectParallaxCarousel";
import DeviceDisplay, {
  DeviceTypes,
} from "components/project-carousel-page/DeviceDisplay";
import PageButtons from "components/project-carousel-page/PageButtons";
import styles from "./ProjectsPresentation.module.scss";

const ProjectsPresentation: React.FC = () => {
  const { projectId = "" } = useParams<{ projectId: string }>();

  const keys = ProjectData.activeKeys;
  const projects = ProjectData.activeProjectsRecord;

  const [stabilizedIndex, setStabilizedIndex] = useState<number | null>(null);
  const [initialIndex] = useState(() =>
    projectId && projects[projectId] ? projects[projectId].index : 0,
  );

  const infoRefElems = useRef<(HTMLDivElement | null)[]>([]);
  const carouselRef = useRef<{ scrollToSlide: (targetIndex: number) => void }>(
    null,
  );

  const navigate = useNavigate();
  const isCarouselSourceRef = useRef(false);

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

  const handleCarouselIndexUpdate = (_index: number) => {};

  const onStableIndex = (index: number) => {
    if (stabilizedIndex !== index) {
      isCarouselSourceRef.current = true;

      const newProjectId = Object.keys(projects).find(
        (key) => projects[key].index === index,
      );

      if (newProjectId && newProjectId !== projectId) {
        navigate(`/portfolio/${newProjectId}`);
      }
    }
  };

  useEffect(() => {
    if (carouselRef.current && projects[projectId]) {
      const targetIndex = projects[projectId].index;

      if (stabilizedIndex !== targetIndex) {
        if (!isCarouselSourceRef.current) {
          carouselRef.current.scrollToSlide(targetIndex);
        }
        setStabilizedIndex(targetIndex);
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
      <div id={"project"} className={styles["projects-presentation-body"]}>
        <LogoSwapper projectId={projects[projectId]?.clientId} />
        <ProjectParallaxCarousel
          ref={carouselRef}
          layer1Slides={laptopSlides}
          layer2Slides={phoneSlides}
          onIndexUpdate={handleCarouselIndexUpdate}
          onStableIndex={onStableIndex}
          initialIndex={initialIndex}
        />
        <PageButtons />
        <div className={`${styles["project-info-wrapper"]} container`}>
          {keys.map((key, i) => (
            <ProjectContent
              key={key}
              isActive={key === projectId}
              transition={""}
              ref={(el) => {
                if (el) infoRefElems.current[i] = el;
              }}
              dataNode={projects[key]}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProjectsPresentation;
