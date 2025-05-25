import React from "react";
import { useSelector } from "react-redux";

import { RootState } from "store/store";
import AppRoutes from "routes/AppRoutes";
import Nav, { NavVariant } from "components/layout/Nav";
import Footer from "components/layout/Footer";
import ScrollToHash from "utils/ScrollToHash";
import { AuthProvider } from "context/AuthContext";
import { useTrackHeroInView } from "hooks/useTrackHeroInView";
import { useAutoCloseMobileNavOnScroll } from "hooks/useAutoCloseMobileNavOnScroll";
import { useFluidPercents } from "hooks/useFluidPercents";
import useClientDimensions from "hooks/useClientDimensions";

import styles from "./App.module.scss";
import "@/styles/styles.scss";

const App: React.FC = () => {
  const isMenuOpen = useSelector(
    (state: RootState) => state.ui.isMobileNavExpanded,
  );

  const isHeroInView = useSelector((state: RootState) => state.ui.isHeroInView);

  useClientDimensions();
  useTrackHeroInView();
  useAutoCloseMobileNavOnScroll();

  const mainContentRef = React.useRef<HTMLDivElement>(null);
  const fluidRef = useFluidPercents([
    [320, 680], // maxScaleBreak, ProjectParallaxCarousel
    [320, 768], // LogoSwapper
    [320, 992], // mainBreak
    [360, 1280], // CurriculumVitae + styles.scss
    [360, 1440], // CurriculumVitae
    [320, 1600], // Future use? Possibly should be the default
  ]);

  const handleLogin = () => {
    sessionStorage.setItem("isLoggedIn", "true");
    window.location.href = "/"; // Redirect to homepage after login
  };

  return (
    <AuthProvider>
      {/* <MainHeightProvider> */}
      <div
        ref={fluidRef}
        className={[
          isHeroInView ? "isHeroInView" : "",
          isMenuOpen ? `isMobileNavExpanded ${styles.isMobileNavExpanded}` : "",
        ].join(" ")}
      >
        <Nav variant={NavVariant.SLIDE_OUT} />
        <div id="top" style={{ position: "absolute", top: "0px" }}></div>
        <div className={styles.underlay} />
        <div id={styles.main} ref={mainContentRef}>
          <Nav variant={NavVariant.TOP_BAR} />
          <ScrollToHash />
          <AppRoutes onLogin={handleLogin} />
        </div>
        <Footer mutationElemRef={mainContentRef} />
      </div>
      {/* </MainHeightProvider> */}
    </AuthProvider>
  );
};

export default App;
