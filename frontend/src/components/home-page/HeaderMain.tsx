import React, { useState, useEffect, useCallback } from "react";

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
  const [scrolled, setScrolled] = useState("");

  const handleScroll = useCallback(() => {
    const newScrolled = window.scrollY > 0 ? styles["scrolled"] : "";
    if (newScrolled !== scrolled) {
      setScrolled(newScrolled);
    }
  }, [scrolled]);

  useEffect(() => {
    const scrollListener = () => {
      handleScroll();
    };

    window.addEventListener("scroll", scrollListener);

    return () => {
      window.removeEventListener("scroll", scrollListener);
    };
  }, [handleScroll]);

  return (
    <header
      id={"headerMain"}
      className={`${styles["header-main"]} ${styles["header"]} ${scrolled}`}
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

      <a href="#list" className={styles["view-portfolio"]}>
        View Portfolio
      </a>
      </div>
    </header>
  );
};

export default HeaderMain;
