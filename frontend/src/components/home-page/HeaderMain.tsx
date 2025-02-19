import React, { useState, useEffect, useRef } from "react";

import headerLogo from "images/main-header/bb-gradient.webp";
import BarberPole from "components/common/BarberPole";
import FluxelGrid from "./fluxel-grid/FluxelGrid";
import styles from "./HeaderMain.module.scss";

/**
 *
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

  const [clientHeight, setClientHeight] = useState(getHeight());

  useEffect(() => {
    const updateClientHeight = () => {
      if (getHeight() !== clientHeight) {
        setClientHeight(getHeight());
      }
    };

    updateClientHeight();

    window.addEventListener("resize", updateClientHeight);
    window.addEventListener("orientationchange", updateClientHeight);

    return () => {
      window.addEventListener("resize", updateClientHeight);
      window.addEventListener("orientationchange", updateClientHeight);
    };
  }, []);

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
      <div className={styles["cubes-wrapper"]}></div>
      <div className={styles["header-wrapper"]}>
        <div className={styles["fluxel-wrapper"]}>
          <FluxelGrid rows={12} cols={12} />
        </div>

        <div className={styles["middle"]}>
          <img
            src={headerLogo}
            className={styles["header-logo"]}
            alt="BB Logo"
          />

          <h1>
            <span className={styles["first-name"]}>Bradley</span>{" "}
            <BarberPole className={styles["barber-pole"]} />{" "}
            <span className={styles["last-name"]}>Baysinger</span>
          </h1>

          <h5 className={`${styles["subhead-mobile"]} ${styles["subhead"]}`}>
            Interactive Web Developer
          </h5>

          <h5 className={`${styles["subhead-desktop"]} ${styles["subhead"]}`}>
            Interactive&nbsp;Web <span className={styles["bull"]}>&bull;</span>{" "}
            <span className={styles["nobr"]}>Front-end Developer</span>
          </h5>
        </div>
        <a href="#list" className={styles["view-portfolio"]}>
          View Portfolio
        </a>
      </div>
    </header>
  );
};

export default HeaderMain;
