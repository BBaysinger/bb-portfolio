import { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Routes, Route } from "react-router-dom";
import ExecutionEnvironment from "exenv";

import { closeMenu } from "store/menuSlice";
import CurriculumVitae from "pages/CurriculumVitae";
import Nav, { NavVariant } from "components/layout/Nav";
import PortfolioList from "components/home-page/PortfolioList";
import Footer from "components/layout/Footer";
import ProjectPage from "pages/ProjectPage";
import ScrollToHash from "utils/ScrollToHash";
import { RootState } from "store/store";
import styles from "./App.module.scss";

const App: React.FC = () => {
  const isMenuOpen = useSelector((state: RootState) => state.menu.isOpen);
  const dispatch = useDispatch();

  const handleScrollOrResize = () => {
    if (isMenuOpen) {
      dispatch(closeMenu());
    }
  };

  useEffect(() => {
    if (ExecutionEnvironment.canUseDOM) {
      window.addEventListener("scroll", handleScrollOrResize);
      window.addEventListener("resize", handleScrollOrResize);
    }
    return () => {
      window.removeEventListener("scroll", handleScrollOrResize);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [dispatch, isMenuOpen]);

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
          <Route path="/portfolio/:projectId" element={<ProjectPage />} />
          <Route path="/cv" element={<CurriculumVitae />} />
        </Routes>
        <Footer />
      </div>
    </>
  );
};

export default App;
