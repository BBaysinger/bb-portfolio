import React, { useState, useEffect, useCallback } from "react";

// import NavBar from "components/layout/NavBar";
import headerLogo from "images/main-header/bb-gradient.png";
import caret from "images/main-header/caret.png";
import styles from "components/layout/Header.module.scss";

const HeaderMain: React.FC = () => {
  // const getHeight = () => {
  //   return Math.max(window.innerHeight, 500);
  // };

  const [caretAnimationStyle, setCaretAnimationStyle] = useState("");
  const [scrolled, setScrolled] = useState(false);

  let animationFrame = 0;

  const stopCaret = useCallback(() => {
    if (!scrolled) {
      setCaretAnimationStyle("none");
      setScrolled(true);
    }
  }, [scrolled]);

  // const scrollDown = () => {
  //   stopCaret();
  //   const targetY = getHeight() - NavBar.HEIGHT + 3;
  //   smoothScrollTo(targetY, 500);
  // };

  // const smoothScrollTo = (targetY: number, duration: number) => {
  //   const startY = window.scrollY;
  //   const distance = targetY - startY;
  //   const startTime = performance.now();

  //   const scrollAnimation = (currentTime: number) => {
  //     const elapsed = currentTime - startTime;
  //     const progress = Math.min(elapsed / duration, 1);

  //     const easeOut = 1 - Math.pow(1 - progress, 3); // Cubic ease-out

  //     window.scrollTo(0, startY + distance * easeOut);

  //     if (progress < 1) {
  //       animationFrame = requestAnimationFrame(scrollAnimation);
  //     }
  //   };

  //   animationFrame = requestAnimationFrame(scrollAnimation);
  // };

  // const handleResize = useCallback(() => {
  //   setTimeout(() => {
  //     setHeight(getHeight());
  //   }, 0);
  // }, []);

  const handleScroll = useCallback(() => {
    stopCaret();
  }, [stopCaret]);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    // window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      // window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrame);
    };
  }, [handleScroll]);

  return (
    <header
      className={`${styles["header-main"]} ${styles["header"]}`}
      // style={{ minHeight: height + "px" }}
    >
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
          <a
            href="#list"
            // onClick={(e) => {
            //   e.preventDefault();
            //   scrollDown();
            // }}
          >
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
