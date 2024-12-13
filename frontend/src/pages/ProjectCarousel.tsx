import React, { useEffect, useRef } from "react";
import { Link, useParams } from "react-router-dom";

import HeaderSub from "components/layout/HeaderSub";
import ProjectContent from "components/project-carousel-page/ProjectContent";
import Swipe from "utils/Swipe";
import ProjectData from "data/ProjectData";
import LogoSwapper from "components/project-carousel-page/LogoSwapper";
import ParallaxStepCarousel from "components/project-carousel-page/ParallaxStepCarousel";
import blankPNG from "assets/images/misc/blank.png";
import DeviceDisplay from "components/project-carousel-page/DeviceDisplay";
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
  const swipe = useRef(Swipe.instance);

  const handleResize = () => {
    // setScale(calculateScale());
  };

  const handleSwiped = () => {
    const keys = ProjectData.activeKeys;
    const currentIndex = keys.indexOf(projectId);
    const newIndex =
      (currentIndex +
        (swipe.current.swipeDirection === Swipe.SWIPE_LT ? 1 : -1) +
        keys.length) %
      keys.length;

    const newId = keys[newIndex];
    window.history.pushState({}, "", `/portfolio/${newId}`);
  };

  useEffect(() => {
    window.addEventListener("resize", handleResize);

    const swiper = document.getElementById("swiper");
    if (swiper) {
      swipe.current.init([swiper as HTMLElement]);
      swipe.current.onSwipe(handleSwiped);
    }

    return () => {
      window.removeEventListener("resize", handleResize);
      swipe.current.kill();
    };
  }, []);

  const keys = ProjectData.activeKeys;
  const prevId = ProjectData.prevKey(projectId);
  const nextId = ProjectData.nextKey(projectId);
  const projects = ProjectData.activeProjectsRecord;

  const mobileSlides = ProjectData.activeProjects.map((project) => (
    <DeviceDisplay deviceType={"phone"} id={project.id} />
  ));
  const desktopSlides = ProjectData.activeProjects.map((project) => (
    <DeviceDisplay deviceType={"desktop"} id={project.id} />
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
        <ParallaxStepCarousel
          layer1Slides={mobileSlides}
          layer2Slides={desktopSlides}
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
