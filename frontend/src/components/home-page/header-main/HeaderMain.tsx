import React, { useState, useEffect } from "react";

import headerLogo from "images/main-header/bb-gradient.webp";
import BarberPole from "components/common/BarberPole";
import FluxelGrid from "./fluxel-grid/FluxelGrid";
import Experiment from "./Slinger";
import ParagraphAnimator from "./ParagraphAnimator";
import styles from "./HeaderMain.module.scss";

/**
 * Header Main
 *
 * @author Bradley Baysinger
 * @since The beginning of time.
 * @version N/A
 */
const HeaderMain: React.FC = () => {
  // const [scrolledToTop, setScrolledToTop] = useState<string>("scrolled-to-top");

  // const lastScrollPosition = useRef(0);
  // const ticking = useRef(false);

  const quotes = [
    "Interactivity is not about clicking, tapping, or swiping. It's about engagement — an invitation to explore, respond, and shape the experience.",
    "A great UI isn't just seen — it's felt. Every transition, every hover, every microinteraction should whisper to the user: 'I understand you.'",
    "Front-end development is storytelling in motion. It's not just about displaying content — it's about guiding, delighting, and responding to the user's curiosity.",
    "True interactivity is invisible. The best experiences don't make users think about how they work — they just feel natural, intuitive, and alive.",
    "The best user interfaces don't compete for attention — they guide it, shaping experiences that feel effortless and inevitable.",
    "Animation isn't decoration; it's communication. A well-timed motion can convey hierarchy, feedback, and flow better than words ever could.",
    "Design is about clarity, development is about precision, and interactivity is about anticipation — knowing what the user needs before they do.",
    "Every pixel, every transition, every interaction is a conversation with the user. Make sure you're speaking their language.",
    "Great front-end development is like great stage design — you don't notice it when it's done well, but it shapes the entire experience.",
    "The web is a living medium. It breathes through animations, responds through interactions, and adapts through responsiveness.",
    "Users don't want to read manuals. They explore. A well-crafted interface should teach them as they interact — no instructions required.",
    "Good UI is like a joke — if you have to explain it, it's not that good.",
    "Responsiveness isn't just about screen sizes — it's about responding to users' needs, behaviors, and expectations in real-time.",
    "Microinteractions are the punctuation marks of user experience. They add rhythm, personality, and meaning to an interface.",
    "Front-end development is the art of making complexity disappear, turning intricate logic into a seamless and intuitive experience.",
    "A well-designed interface is like a well-told story — every detail matters, and every interaction should feel intentional.",
    "Interfaces should be designed with curiosity in mind. If the user wants to explore, let them — and reward them for doing so.",
  ];

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
      const h = getHeight();
      const w = getWidth();

      if (h !== clientHeight || w !== clientWidth) {
        // This is the only way to get the 'short' height of the mobile viewport.
        // That is, the height before the address bar is hidden from scrolling down.
        // 'dvh' here can't be used because it causes a layout shift.
        setClientHeight(h);
        setClientWidth(w);
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

  // useEffect(() => {
  //  KEEP: This was for the view portfolio CTA that's probably coming back.
  //   const handleEvent = () => {
  //     if (!ticking.current) {
  //       ticking.current = true;

  //       requestAnimationFrame(() => {
  //         const currentScrollPosition = window.scrollY;

  //         const newScrolledToTop =
  //           currentScrollPosition > 0 ? "" : styles["scrolled-to-top"];
  //         if (newScrolledToTop !== scrolledToTop) {
  //           console.log('newScrolledToTop', newScrolledToTop);
  //           setScrolledToTop(newScrolledToTop);
  //         }

  //         lastScrollPosition.current = currentScrollPosition;
  //         ticking.current = false;
  //       });
  //     }
  //   };

  //   window.addEventListener("scroll", handleEvent);
  //   window.addEventListener("resize", handleEvent);
  //   window.addEventListener("orientationchange", handleEvent);

  //   return () => {
  //     window.removeEventListener("scroll", handleEvent);
  //     window.removeEventListener("resize", handleEvent);
  //     window.removeEventListener("orientationchange", handleEvent);
  //   };
  // }, [scrolledToTop]);

  return (
    <header
      id={"headerMain"}
      className={
        `${styles["header-main"]} ${styles["header"]} header-main` // +
        // `${scrolledToTop ? styles["scrolled-to-top"] : ""}`
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
      <ParagraphAnimator paragraphs={quotes} className={styles["message"]} />
      {/* {true && (
        <div className={styles["debug"]}>
          {clientWidth}, {clientHeight}
        </div>
      )} */}
    </header>
  );
};

export default HeaderMain;
