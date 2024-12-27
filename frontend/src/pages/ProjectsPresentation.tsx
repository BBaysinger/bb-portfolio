import React, { useRef } from "react";
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
    null,
  );
  const { projectId = "" } = useParams<{ projectId: string }>();

  // const infoRefElems = useRef<Array<ProjectContent | null>>([]);

  // const keys = ProjectData.activeKeys;
  const projects = ProjectData.activeProjectsRecord;

  const laptopSlides = ProjectData.activeProjects.map((project) => (
    <DeviceDisplay deviceType={DeviceTypes.LAPTOP} id={project.id} />
  ));

  const phoneSlides = ProjectData.activeProjects.map((project) => (
    <DeviceDisplay
      deviceType={DeviceTypes.PHONE}
      mobileStatus={project.mobileStatus}
      id={project.id}
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
    // console.log("Updated index: ", index);
  };

  const onStableIndex = (_index: number) => {
    // console.log("Stable index: ", index);
  };

  return (
    <div className={styles["projects-presentation"]}>
      <HeaderSub
        head={projects[projectId].title}
        subhead={projects[projectId].tags}
      />
      <div className={styles["projects-presentation-body"]}>
        <LogoSwapper projectId={projects[projectId].clientId} />
        <ProjectParallaxCarousel
          ref={carouselRef}
          layer1Slides={laptopSlides}
          layer2Slides={phoneSlides}
          onIndexUpdate={handleCarouselIndexUpdate}
          onStableIndex={onStableIndex}
        />
        <PageButtons />
        {/* <ProjectContent /> */}
        {/* <div id={styles.projectContent}>{infoElems}</div> */}
      </div>
    </div>
  );
};

export default ProjectsPresentation;
