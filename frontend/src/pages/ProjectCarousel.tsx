import React, { useEffect, useRef } from "react";
import { Link, useParams } from "react-router-dom";

import HeaderSub from "components/layout/HeaderSub";
import ProjectContent from "components/project-carousel-page/ProjectContent";
import ProjectData from "data/ProjectData";
import LogoSwapper from "components/project-carousel-page/LogoSwapper";
import ProjectParallaxCarousel from "components/project-carousel-page/ProjectParallaxCarousel";
import blankPNG from "images/misc/blank.png";
import DeviceDisplay, {
  DeviceTypes,
} from "components/project-carousel-page/DeviceDisplay";
import styles from "./ProjectCarousel.module.scss";

// const calculateScale = () => {
//   const height = window.innerHeight;
//   const width = window.innerWidth;
//   return Math.min(width / 693, height / 600, 1);
// };

const ProjectCarousel: React.FC = () => {
  const { projectId = "" } = useParams<{ projectId: string }>();

  // const [scale, setScale] = useState(() => calculateScale());
  const infoRefElems = useRef<Array<ProjectContent | null>>([]);

  const handleResize = () => {
    // setScale(calculateScale());
  };

  useEffect(() => {
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const keys = ProjectData.activeKeys;
  const prevId = ProjectData.prevKey(projectId);
  const nextId = ProjectData.nextKey(projectId);
  const projects = ProjectData.activeProjectsRecord;

  const laptopSlides = ProjectData.activeProjects.map((project) => (
    <DeviceDisplay deviceType={DeviceTypes.LAPTOP} id={project.id} />
  ));
  const phoneSlides = ProjectData.activeProjects.map((project) => (
    <DeviceDisplay deviceType={DeviceTypes.PHONE} id={project.id} />
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
    <div id={styles.projectCarousel}>
      <HeaderSub
        head={projects[projectId].title}
        subhead={projects[projectId].tags}
      />
      <div id={styles.projectCarouselBody}>
        <LogoSwapper id={projects[projectId].clientId} />
        <ProjectParallaxCarousel
          layer1Slides={laptopSlides}
          layer2Slides={phoneSlides}
        />
        <div id={styles.projectNav}>
          <Link
            to={`/portfolio/${prevId}`}
            className={`${styles["nav-button"]} ${styles.prev}`}
          >
            <img src={blankPNG} alt="Previous" />
          </Link>
          <Link
            to={`/portfolio/${nextId}`}
            className={`${styles["nav-button"]} ${styles.next}`}
          >
            <img src={blankPNG} alt="Next" />
          </Link>
        </div>
        <div id={styles.projectContent}>{infoElems}</div>
      </div>
    </div>
  );
};

export default ProjectCarousel;
