import React, { useEffect, useState, useRef } from "react";
import { Link, useParams } from "react-router-dom";

import HeaderSub from "components/HeaderSub";
import ProjectContent from "components/ProjectContent";
import Swipe from "utils/Swipe";
import PortfolioDataUtil from "data/PortfolioDataUtil";
import blankPNG from "assets/images/misc/blank.png";
import json from "data/portfolio.json";
import { PortfolioData, PortfolioProjectBase } from "data/portfolioTypes";
import styles from "./ProjectCarousel.module.scss";

const Constants = {
  pdJson: json as PortfolioData,
};

const calculateScale = () => {
  const height = window.innerHeight;
  const width = window.innerWidth;
  return Math.min(width / 693, height / 600, 1);
};

const ProjectCarousel: React.FC = () => {
  const { projectId = "" } = useParams<{ projectId: string }>();

  const [scale, setScale] = useState(() => calculateScale());
  const infoRefElems = useRef<Array<ProjectContent | null>>([]);
  const swipe = useRef(Swipe.instance);

  const handleResize = () => {
    setScale(calculateScale());
  };

  void scale;

  const handleSwiped = () => {
    const keys = PortfolioDataUtil.activeKeys;
    const currentIndex = keys.indexOf(projectId);
    const newIndex =
      (currentIndex +
        (swipe.current.swipeDirection === Swipe.SWIPE_LT ? 1 : -1) +
        keys.length) %
      keys.length;

    // Navigate to the new slide
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

  const keys = PortfolioDataUtil.activeKeys;
  const projectData: PortfolioProjectBase = Constants.pdJson[projectId];
  if (!projectData) {
    return (
      <div className="error">Error: No data for project ID "{projectId}"</div>
    );
  }

  const prevId = PortfolioDataUtil.prevKey(projectId);
  const nextId = PortfolioDataUtil.nextKey(projectId);

  const clientLogos = Object.keys(Constants.pdJson).map((key) => {
    const logoClass = key === projectData.clientId ? "visible" : "";
    return <div key={key} className={`client-logo ${logoClass}`}></div>;
  });

  const infoElems = keys.map((key, i) => (
    <ProjectContent
      key={key}
      transition={""}
      ref={(el: ProjectContent | null) => {
        if (el) infoRefElems.current[i] = el;
      }}
      projectData={Constants.pdJson[key]}
    />
  ));

  return (
    <div id={styles.projectCarousel}>
      <HeaderSub head={projectData.title} subhead={projectData.tags} />
      <div id={styles.projectCarouselBody}>
        <div id={styles.test}>{`projectId: ${projectId}`}</div>

        <div className="logo-container">{clientLogos}</div>

        <div id={styles.swiper}></div>

        <div id={styles.projectNav}>
          <Link
            to={`/portfolio/${prevId}`}
            className={`${styles["nav-button"]} ${styles.prev}`}
          >
            <img src={blankPNG} alt="Previous" />
            {`/portfolio/${prevId}`}
          </Link>
          <Link
            to={`/portfolio/${nextId}`}
            className={`${styles["nav-button"]} ${styles.next}`}
          >
            <img src={blankPNG} alt="Next" />
            {`/portfolio/${nextId}`}
          </Link>
        </div>

        <div id={styles.projectContent}>{infoElems}</div>
      </div>
    </div>
  );
};

export default ProjectCarousel;
