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

const ProjectCarousel: React.FC<{ projectId?: string }> = ({
  projectId: propProjectId,
}) => {
  const params = useParams();
  const projectId = propProjectId || params.projectId || "";

  const [currentProjectId, setCurrentProjectId] = useState(projectId);
  const [scale, setScale] = useState(() => calculateScale());
  const infoRefElems = useRef<Array<ProjectContent | null>>([]);
  const swipe = useRef(Swipe.instance);

  const handleResize = () => {
    setScale(calculateScale());
  };

  const handleSwiped = () => {
    if (swipe.current.swipeDirection === Swipe.SWIPE_LT) {
      navigateToSlide(1);
    } else if (swipe.current.swipeDirection === Swipe.SWIPE_RT) {
      navigateToSlide(-1);
    }
  };

  const navigateToSlide = (direction: number) => {
    const keys = PortfolioDataUtil.activeKeys;
    const currentIndex = keys.indexOf(currentProjectId);
    const newIndex = (currentIndex + direction + keys.length) % keys.length;
    setCurrentProjectId(keys[newIndex]);
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
  const projectData: PortfolioProjectBase = Constants.pdJson[currentProjectId];
  if (!projectData) {
    return (
      <div className="error">
        Error: No data for project ID "{currentProjectId}"
      </div>
    );
  }

  const prevId = PortfolioDataUtil.prevKey(currentProjectId);
  const nextId = PortfolioDataUtil.nextKey(currentProjectId);

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
        <div id={styles.test}>{`currentProjectId: ${currentProjectId}`}</div>

        <div className="logo-container">{clientLogos}</div>

        <div id="swiper" style={{ transform: `scale(${scale})` }}>
          <div className="info-wrapper">{infoElems}</div>
        </div>

        <div className="nav-buttons">
          <Link to={`/portfolio/${prevId}`} className="nav-button prev">
            <img src={blankPNG} alt="Previous" />
          </Link>
          <Link to={`/portfolio/${nextId}`} className="nav-button next">
            <img src={blankPNG} alt="Next" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ProjectCarousel;
