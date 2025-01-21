import React, { useState, useEffect, useRef } from "react";

import headerLogo from "images/main-header/bb-gradient.webp";
import styles from "./HeaderMain.module.scss";

/**
 *
 *
 * @author Bradley Baysinger
 * @since The beginning of time.
 * @version N/A
 */
const HeaderMain: React.FC = () => {
  const [lastScrollDirection, setLastScrollDirection] = useState<
    "scrolled-up" | "scrolled-down"
  >("scrolled-up");
  const [scrolledToTop, setScrolledToTop] = useState<string>("scrolled-to-top");

  const lastScrollPosition = useRef(0);
  const ticking = useRef(false);

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

          // Idea here is to have the header dynamic height reset before
          // the header is scroll back into veiw. Unfortunately, the recoil
          // from inertial scrolling makes scroll direction tricky.
          // Coming back to this later.
          if (
            currentScrollPosition > lastScrollPosition.current &&
            lastScrollDirection !== "scrolled-down"
          ) {
            setLastScrollDirection("scrolled-down");
          } else if (
            currentScrollPosition < lastScrollPosition.current &&
            lastScrollDirection !== "scrolled-up"
          ) {
            setLastScrollDirection("scrolled-up");
            console.log(currentScrollPosition);
          }

          lastScrollPosition.current = currentScrollPosition;
          ticking.current = false;
        });
      }
    };

    window.addEventListener("scroll", handleEvent);
    window.addEventListener("resize", handleEvent);

    // Clean up the event listener on component unmount
    return () => {
      window.removeEventListener("scroll", handleEvent);
      window.removeEventListener("resize", handleEvent);
    };
  }, [lastScrollDirection, scrolledToTop]);

  return (
    <header
      id={"headerMain"}
      className={
        `${styles["header-main"]} ${styles["header"]} ` +
        `${styles[lastScrollDirection]} ${scrolledToTop ? styles["scrolled-to-top"] : ""}`
      }
    >
      <div className={styles["header-wrapper"]}>
        <img src={headerLogo} className={styles["header-logo"]} alt="BB Logo" />
        <div className={styles["main-text"]}>
          <h1>
            <span className={styles["first-name"]}>Bradley</span>{" "}
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
      </div>

      <div className={styles["header-dvh"]}>
        <a href="#list" className={styles["view-portfolio"]}>
          View Portfolio
        </a>
      </div>
    </header>
  );
};

export default HeaderMain;
