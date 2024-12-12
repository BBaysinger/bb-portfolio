import { useState, useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import ExecutionEnvironment from "exenv";

import NavBar from "components/layout/NavBar";
import CurriculumVitae from "pages/CurriculumVitae";
import SlideOutNav from "components/layout/SlideOutNavigation";
import PortfolioList from "components/home-page/PortfolioList";
import Footer from "components/layout/Footer";
import ProjectCarousel from "pages/ProjectCarousel";
import ScrollToHash from "utils/ScrollToHash";
import "./App.scss";

/**
 *
 */
const App = () => {
  // State to manage whether the slide-out menu is active
  const [slideOut, setSlideOut] = useState(false);

  // Tracks whether a scroll event is being handled
  let ticking = false;

  // Toggles the slide-out menu
  const toggleSlideOutHandler = () => {
    setSlideOut((prevSlideOut) => !prevSlideOut);
  };

  // Collapses the slide-out menu
  const collapseSlideOutHandler = () => {
    if (slideOut) {
      setSlideOut(false);
    }
  };

  // Handles window resize and collapses the slide-out menu
  const handleResize = () => {
    collapseSlideOutHandler();
  };

  // Handles scroll events and collapses the slide-out menu
  const handleScroll = () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        collapseSlideOutHandler();
        ticking = false;
      });
      ticking = true;
    }
  };

  // Effect to set up event listeners for scroll and resize
  useEffect(() => {
    if (ExecutionEnvironment.canUseDOM) {
      window.addEventListener("scroll", handleScroll, false);
      window.addEventListener("resize", handleResize, false);
    }

    // Cleanup event listeners on component unmount
    return () => {
      window.removeEventListener("scroll", handleScroll, false);
      window.removeEventListener("resize", handleResize, false);
    };
  }, [slideOut]); // Re-run effect when `slideOut` state changes

  // Calculate half the width of the window, rounded down
  const getRoundedHalfWidth = () => {
    return Math.floor(window.innerWidth / 2) + "px";
  };

  return (
    <>
      <SlideOutNav collapseSlideOutHandler={handleResize}></SlideOutNav>
      <div id="main" style={slideOut ? { right: getRoundedHalfWidth() } : {}}>
        <NavBar
          toggleSlideOutHandler={toggleSlideOutHandler}
          collapseSlideOutHandler={handleResize}
        ></NavBar>
        <ScrollToHash />
        <Routes>
          <Route path="/">
            <Route path="/" element={<PortfolioList />}></Route>
            <Route path="/portfolio" element={<PortfolioList />}></Route>
            <Route
              path="/portfolio/:projectId"
              element={<ProjectCarousel />}
            ></Route>
            <Route path="/cv" element={<CurriculumVitae />}></Route>
          </Route>
        </Routes>
        <Footer></Footer>
      </div>
    </>
  );
};

export default App;
