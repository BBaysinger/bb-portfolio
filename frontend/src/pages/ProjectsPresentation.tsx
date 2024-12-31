import React, { useRef, useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

import HeaderSub from "components/layout/HeaderSub";
// import ProjectContent from "components/project-carousel-page/ProjectContent";
import ProjectData from "data/ProjectData";
import LogoSwapper from "components/project-carousel-page/LogoSwapper";
import ProjectParallaxCarousel from "components/project-carousel-page/ProjectParallaxCarousel";
import DeviceDisplay, {
  DeviceTypes,
} from "components/project-carousel-page/DeviceDisplay";
import PageButtons from "components/project-carousel-page/PageButtons";
import styles from "./ProjectsPresentation.module.scss";

const ProjectsPresentation: React.FC = () => {
  const carouselRef = useRef<{ scrollToSlide: (targetIndex: number) => void }>(
    null,
  );
  const { projectId = "" } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  // const infoRefElems = useRef<Array<ProjectContent | null>>([]);

  // const keys = ProjectData.activeKeys;
  const projects = ProjectData.activeProjectsRecord;

  // Set the initial index only once during the first render
  const [initialIndex] = useState(() =>
    projectId && projects[projectId] ? projects[projectId].index : 0,
  );

  // Track the current stabilized index
  const [stabilizedIndex, setStabilizedIndex] = useState<number | null>(null);

  // Ref to track if the last stabilized index was caused by the carousel
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

  // const infoElems = keys.map((key, i) => (
  //   <ProjectContent
  //     key={key}
  //     transition={""}
  //     ref={(el: ProjectContent | null) => {
  //       if (el) infoRefElems.current[i] = el;
  //     }}
  //     projectData={projects[key]}
  //   />
  // ));

  const handleCarouselIndexUpdate = (_index: number) => {
    // Optional: Logic for intermediate updates
  };

  const onStableIndex = (index: number) => {
    console.info("Stable index: ", index);

    if (stabilizedIndex !== index) {
      // Mark that the stabilized index came from the carousel
      isCarouselSourceRef.current = true;

      // Find the project ID corresponding to the index
      const newProjectId = Object.keys(projects).find(
        (key) => projects[key].index === index,
      );

      if (newProjectId && newProjectId !== projectId) {
        navigate(`/portfolio/${newProjectId}`);
      }
    }
  };

  // Effect: Sync carousel with route on projectId change
  useEffect(() => {
    if (carouselRef.current && projects[projectId]) {
      const targetIndex = projects[projectId].index;

      if (stabilizedIndex !== targetIndex) {
        if (!isCarouselSourceRef.current) {
          // Only scroll if the change did not originate from the carousel
          carouselRef.current.scrollToSlide(targetIndex);
        }
        setStabilizedIndex(targetIndex);
      }
    }

    // Reset the source flag after handling
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
          initialIndex={initialIndex} // Fixed initial index
        />
        <PageButtons />
      </div>
    </div>
  );
};

export default ProjectsPresentation;
