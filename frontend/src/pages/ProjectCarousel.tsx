import React, { useRef } from "react";
import { useParams } from "react-router-dom";

import HeaderSub from "components/layout/HeaderSub";
import ProjectContent from "components/project-carousel-page/ProjectContent";
import ProjectData from "data/ProjectData";
import LogoSwapper from "components/project-carousel-page/LogoSwapper";
import ProjectParallaxCarousel from "components/project-carousel-page/ProjectParallaxCarousel";
import DeviceDisplay, {
  DeviceTypes,
} from "components/project-carousel-page/DeviceDisplay";
import NavButtons from "components/project-carousel-page/NavButtons";
import styles from "./ProjectCarousel.module.scss";

const ProjectCarousel: React.FC = () => {
  const { projectId = "" } = useParams<{ projectId: string }>();

  const infoRefElems = useRef<Array<ProjectContent | null>>([]);

  const keys = ProjectData.activeKeys;
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

  const infoElems = keys.map((key, i) => (
    <ProjectContent
      key={key}
      transition={""}
      ref={(el: ProjectContent | null) => {
        if (el) infoRefElems.current[i] = el;
      }}
      projectData={projects[key]}
    />
  ));

  return (
    <div className={styles["project-carousel"]}>
      <HeaderSub
        head={projects[projectId].title}
        subhead={projects[projectId].tags}
      />
      <div className={styles["project-carousel-body"]}>
        <LogoSwapper projectId={projects[projectId].clientId} />
        <ProjectParallaxCarousel
          layer1Slides={laptopSlides}
          layer2Slides={phoneSlides}
        />
        <NavButtons />
        <div id={styles.projectContent}>{infoElems}</div>
      </div>
    </div>
  );
};

export default ProjectCarousel;
