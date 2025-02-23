import React, { useState, useEffect, useRef } from "react";

import headerLogo from "images/main-header/bb-gradient.webp";
import BarberPole from "components/common/BarberPole";
import FluxelGrid from "./fluxel-grid/FluxelGrid";
import Experiment from "./SlingyBall";
import styles from "./HeaderMain.module.scss";

/**
 * Header Main
 *
 * @author Bradley Baysinger
 * @since The beginning of time.
 * @version N/A
 */
const HeaderMain: React.FC = () => {
  const [scrolledToTop, setScrolledToTop] = useState<string>("scrolled-to-top");

  const lastScrollPosition = useRef(0);
  const ticking = useRef(false);

  const getHeight = () => {
    // This is the only way to get the 'short' height of the mobile viewport.
    // That is, the height before the address bar is hidden from scrolling down.
    // 'dvh' here can't be used because it causes a layout shift.
    return document.documentElement.clientHeight;
  };

  const getWidth = () => {
    return document.documentElement.clientWidth;
  };

  const [clientHeight, setClientHeight] = useState(getHeight());
  const [clientWidth, setClientWidth] = useState(getWidth());

  useEffect(() => {
    const updateClientDimensions = () => {
      const height = getHeight();
      const width = getWidth();

      if (height !== clientHeight || width !== clientWidth) {
        // This is the only way to get the 'short' height of the mobile viewport.
        // That is, the height before the address bar is hidden from scrolling down.
        // 'dvh' here can't be used because it causes a layout shift.
        setClientHeight(height);
        setClientWidth(width);
      }
    };

    updateClientDimensions();

    window.addEventListener("resize", updateClientDimensions);
    window.addEventListener("orientationchange", updateClientDimensions);

    return () => {
      window.removeEventListener("resize", updateClientDimensions);
      window.removeEventListener("orientationchange", updateClientDimensions);
    };
  }, [clientHeight, clientWidth]);

  useEffect(() => {
    const handleEvent = () => {
      if (!ticking.current) {
        ticking.current = true;

        requestAnimationFrame(() => {
          const currentScrollPosition = window.scrollY;

          const newScrolledToTop =
            currentScrollPosition > 0 ? "" : styles["scrolled-to-top"];
          if (newScrolledToTop !== scrolledToTop) {
            setScrolledToTop(newScrolledToTop);
          }

          lastScrollPosition.current = currentScrollPosition;
          ticking.current = false;
        });
      }
    };

    window.addEventListener("scroll", handleEvent);
    window.addEventListener("resize", handleEvent);
    window.addEventListener("orientationchange", handleEvent);

    return () => {
      window.removeEventListener("scroll", handleEvent);
      window.removeEventListener("resize", handleEvent);
      window.removeEventListener("orientationchange", handleEvent);
    };
  }, [scrolledToTop]);

  return (
    <header
      id={"headerMain"}
      className={
        `${styles["header-main"]} ${styles["header"]} header-main` +
        `${scrolledToTop ? styles["scrolled-to-top"] : ""}`
      }
      style={{ minHeight: `${clientHeight}px` }}
    >
      <div className={styles["fluxel-wrapper"]}>
        <FluxelGrid
          rows={12}
          cols={12}
          viewableWidth={clientWidth}
          viewableHeight={clientHeight}
        />
      </div>
      <div className={styles["balls-wrapper"]}>
        <Experiment />
      </div>
      <div className={styles["header-wrapper"]}>
        <div className={styles["logo-wrapper"]}>
          <img
            src={headerLogo}
            className={styles["header-logo"]}
            alt="BB Logo"
          />
        </div>

        <h1>
          <span className={styles["first-name"]}>Bradley</span>{" "}
          <span className={styles["nobr"]}>
            <BarberPole className={styles["barber-pole"]} />{" "}
            <span className={styles["last-name"]}>Baysinger</span>
          </span>
        </h1>

        <h5 className={`${styles["subhead"]}`}>
          Interactive&nbsp;Web <span className={styles["bull"]}>&bull;</span>{" "}
          <span className={styles["nobr"]}>Front-end Developer</span>
        </h5>
        {/* <a href="#list" className={styles["view-portfolio"]}>
          View Portfolio
        </a> */}
      </div>
      <div className={styles["message"]}>
        Interactivity is not about clicking, tapping, or swiping. It's about
        engagement — an invitation to explore, respond, and shape the
        experience.
      </div>
      {/* {true && (
        <div className={styles["debug"]}>
          {clientWidth}, {clientHeight}
        </div>
      )} */}
    </header>
  );
};

export default HeaderMain;
