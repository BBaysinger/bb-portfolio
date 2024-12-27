import { useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { Routes, Route } from "react-router-dom";
import ExecutionEnvironment from "exenv";

import CurriculumVitae from "pages/CurriculumVitae";
import Nav, { NavVariant } from "components/layout/Nav";
import PortfolioList from "components/home-page/PortfolioList";
import Footer from "components/layout/Footer";
import ProjectsPresentation from "pages/ProjectsPresentation";
import ScrollToHash from "utils/ScrollToHash";
import { RootState } from "store/store";
import styles from "./App.module.scss";

const App: React.FC = () => {
  // const [slideOut, setSlideOut] = useState(false);
  const ticking = useRef(false);
  const isMenuOpen = useSelector((state: RootState) => state.menu.isOpen);

  // const toggleSlideOutHandler = () => setSlideOut((prev) => !prev);
  // const collapseSlideOutHandler = () => slideOut && setSlideOut(false);

  // const handleResize = collapseSlideOutHandler;

  const handleScrollOrScroll = () => {
    if (!ticking.current) {
      window.requestAnimationFrame(() => {
        // collapseSlideOutHandler();
        ticking.current = false;
      });
      ticking.current = true;
    }
  };

  useEffect(() => {
    if (ExecutionEnvironment.canUseDOM) {
      window.addEventListener("scroll", handleScrollOrScroll, false);
      window.addEventListener("resize", handleScrollOrScroll, false);
    }
    return () => {
      window.removeEventListener("scroll", handleScrollOrScroll, false);
      window.removeEventListener("resize", handleScrollOrScroll, false);
    };
  }, []);

  return (
    <>
      <Nav variant={NavVariant.SLIDE_OUT} />
      <div
        id={styles.main}
        className={isMenuOpen ? styles["nav-expanded"] : ""}
      >
        <Nav variant={NavVariant.TOP_BAR} />
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
