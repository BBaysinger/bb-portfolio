import { useState, useEffect, useRef } from "react";
import { Routes, Route } from "react-router-dom";
import ExecutionEnvironment from "exenv";

import NavBar from "components/layout/NavBar";
import CurriculumVitae from "pages/CurriculumVitae";
import SlideOutNav from "components/layout/SlideOutNavigation";
import PortfolioList from "components/home-page/PortfolioList";
import Footer from "components/layout/Footer";
import ProjectsPresentation from "pages/ProjectsPresentation";
import ScrollToHash from "utils/ScrollToHash";
import styles from "./App.module.scss";

const App: React.FC = () => {
  const [slideOut, setSlideOut] = useState(false);
  const ticking = useRef(false);

  const toggleSlideOutHandler = () => setSlideOut((prev) => !prev);
  const collapseSlideOutHandler = () => slideOut && setSlideOut(false);

  const handleResize = collapseSlideOutHandler;

  const handleScroll = () => {
    if (!ticking.current) {
      window.requestAnimationFrame(() => {
        collapseSlideOutHandler();
        ticking.current = false;
      });
      ticking.current = true;
    }
  };

  useEffect(() => {
    if (ExecutionEnvironment.canUseDOM) {
      window.addEventListener("scroll", handleScroll, false);
      window.addEventListener("resize", handleResize, false);
    }
    return () => {
      window.removeEventListener("scroll", handleScroll, false);
      window.removeEventListener("resize", handleResize, false);
    };
  }, []); // No dependencies needed here

  return (
    <>
      <SlideOutNav
        collapseSlideOutHandler={handleResize}
        aria-hidden={!slideOut}
      />
      <div id={styles.main} className={slideOut ? styles["nav-expanded"] : ""}>
        <NavBar
          toggleSlideOutHandler={toggleSlideOutHandler}
          // collapseSlideOutHandler={handleResize}
        />
        <ScrollToHash />
        <Routes>
          <Route path="/" element={<PortfolioList />} />
          <Route path="/portfolio" element={<PortfolioList />} />
          <Route
            path="/portfolio/:projectId"
            element={<ProjectsPresentation />}
          />
          <Route path="/cv" element={<CurriculumVitae />} />
        </Routes>
        <Footer />
      </div>
    </>
  );
};

export default App;
