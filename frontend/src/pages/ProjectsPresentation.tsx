import React, { useRef, useEffect } from "react";
import { useParams } from "react-router-dom";

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
    null
  );
  const { projectId = "" } = useParams<{ projectId: string }>();

  // const infoRefElems = useRef<Array<ProjectContent | null>>([]);

  // const keys = ProjectData.activeKeys;
  const projects = ProjectData.activeProjectsRecord;

  const laptopSlides = ProjectData.activeProjects.map((project) => (
    <DeviceDisplay deviceType={DeviceTypes.LAPTOP} id={project.id} key={project.id} />
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
    // console.info("Updated index: ", index);
  };

  const onStableIndex = (_index: number) => {
    // console.info("Stable index: ", index);
  };

  // Scroll to the initial slide when projectId changes
  useEffect(() => {
    if (carouselRef.current && projects[projectId]) {
      const targetIndex = projects[projectId].index;
      carouselRef.current.scrollToSlide(targetIndex);
    }
  }, [projectId, projects]);

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
          initialIndex={projects[projectId]?.index}
        />
        <PageButtons />
        {/* <ProjectContent /> */}
        {/* <div id={styles.projectContent}>{infoElems}</div> */}
      </div>
    </div>
  );
};

export default ProjectsPresentation;
