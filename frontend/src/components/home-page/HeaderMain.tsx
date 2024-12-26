import React, { useState, useEffect, useCallback } from "react";

import headerLogo from "images/main-header/bb-gradient.png";
import styles from "./HeaderMain.module.scss";

const HeaderMain: React.FC = () => {
  const [caretAnimationStyle, setCaretAnimationStyle] = useState("");
  const [scrolled, setScrolled] = useState(false);

  let animationFrame = 0;

  const stopCaret = useCallback(() => {
    if (!scrolled) {
      setCaretAnimationStyle("none");
      setScrolled(true);
    }
  }, [scrolled]);

  const handleScroll = useCallback(() => {
    stopCaret();
  }, [stopCaret]);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      cancelAnimationFrame(animationFrame);
    };
  }, [handleScroll]);

  return (
    <header className={`${styles["header-main"]} ${styles["header"]}`}>
      <div className={styles["overhead-fill"]}></div>

      <img src={headerLogo} className={styles["header-logo"]} alt="BB Logo" />
      <div className={styles["main-text"]}>
        <h1>
          <span className={styles["first-name"]}>Bradley</span>{" "}
          <span className={styles["last-name"]}>Baysinger</span>
        </h1>

        <h5 className={styles["subhead"]}>
          <span>
            Interactive&nbsp;Web &bull;{" "}
            <span className={styles["nobr"]}>Front-end Developer</span>
          </span>
        </h5>
      </div>

      <a
        href="#list"
        className={styles["view-portfolio"]}
        style={{ animation: caretAnimationStyle }}
      >
        <h6>View Portfolio</h6>
      </a>
    </header>
  );
};

export default HeaderMain;
