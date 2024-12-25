import React, { useState, useEffect, useCallback } from "react";

import headerLogo from "images/main-header/bb-gradient.png";
import caret from "images/main-header/caret.png";
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
      <h1>
        <span className={styles["first-name"]}>Bradley</span>&nbsp;
        <span className={styles["last-name"]}>Baysinger</span>
      </h1>

      <h5 className={styles["subhead"]}>
        <span style={{ lineHeight: "26px" }}>
          Interactive&nbsp;Web &bull;
          <span className={styles["nobr"]}>Front-end Developer</span>
        </span>
      </h5>

      <div
        className={styles["view-portfolio"]}
        style={{ animation: caretAnimationStyle }}
      >
        <div>
          <a href="#list">
            <h6>View Portfolio</h6>
            <img
              src={caret}
              width="50"
              height="30"
              className={styles["caret-img"]}
              alt=""
            />
          </a>
        </div>
      </div>
    </header>
  );
};

export default HeaderMain;
