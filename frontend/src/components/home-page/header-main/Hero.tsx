import React, { useState, useCallback, useRef } from "react";

import useClientDimensions from "hooks/useClientDimensions";
import headerLogo from "images/main-header/bb-gradient.webp";
import BarberPole from "components/common/BarberPole";
import FluxelGrid from "./fluxel-grid/FluxelGrid";
import Slinger from "./Slinger";
import ParagraphAnimator from "./ParagraphAnimator";
import useScrollPersistedClass from "hooks/useScrollPersistedClass";
import styles from "./Hero.module.scss";

/**
 * Hero
 *
 * @author Bradley Baysinger
 * @since The beginning of time.
 * @version N/A
 */
const Hero: React.FC = () => {
  const id = "hero";
  const hasScrolledOut = useScrollPersistedClass(id);

  const wrapperRef = useRef<HTMLDivElement>(null);

  const { clientHeight, clientWidth } = useClientDimensions();

  // For sending position data to the FluxelGrid.
  const [slingerPos, setSlingerPos] = useState<
    { x: number; y: number } | null | undefined
  >(undefined);

  const [_hasDragged, setHasDragged] = useState(
    sessionStorage.getItem("hasDragged") === "true",
  );

  const onSlingerDrag = useCallback(
    (x: number, y: number, e: MouseEvent | TouchEvent) => {
      sessionStorage.setItem("hasDragged", "true");
      setHasDragged(true);
      if (
        e.type === "touchmove" &&
        wrapperRef.current?.firstElementChild instanceof HTMLElement
      ) {
        const bounds =
          wrapperRef.current?.firstElementChild.getBoundingClientRect();
        if (!bounds) return;
        const offsetX = x - bounds.x;
        const offsetY = y - bounds.y;
        setSlingerPos({ x: offsetX, y: offsetY });
      }
    },
    [],
  );

  const onSlingerDragEnd = useCallback(
    (_x: number, _y: number, e: MouseEvent | TouchEvent) => {
      if (e.type === "touchend") {
        setSlingerPos(null);
      }
    },
    [],
  );

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
    // "Good UI is like a joke — if you have to explain it, it's not that good.",
    "Responsiveness isn't just about screen sizes — it's about responding to users' needs, behaviors, and expectations in real-time.",
    "Microinteractions are the punctuation marks of user experience. They add rhythm, personality, and meaning to an interface.",
    "Front-end development is the art of making complexity disappear, turning intricate logic into a seamless and intuitive experience.",
    "A well-designed interface is like a well-told story — every detail matters, and every interaction should feel intentional.",
    "Interfaces should be designed with curiosity in mind. If the user wants to explore, let them — and reward them for doing so.",
  ];

  return (
    <header
      id={id}
      className={
        `${styles.hero} ${styles["header"]} hero ` +
        `${hasScrolledOut ? styles["has-scrolled-out"] : ""} ` +
        `${sessionStorage.getItem("hasDragged") === "true" ? styles["hasDragged"] : ""}`
      }
      style={{ minHeight: `${clientHeight}px` }}
    >
      <div className={styles["debug"]}>
        {sessionStorage.getItem("hasDragged")}
      </div>
      <div ref={wrapperRef} className={styles["fluxelWrapper"]}>
        <FluxelGrid
          rows={12}
          cols={16}
          viewableWidth={clientWidth}
          viewableHeight={clientHeight}
          externalMousePos={slingerPos}
        />
      </div>
      <div className={`${styles["slingerWrapper"]} `}>
        <Slinger onDrag={onSlingerDrag} onDragEnd={onSlingerDragEnd} />
      </div>
      <div className={styles["heroWrapper"]}>
        <div className={styles["logoWrapper"]}>
          <img src={headerLogo} className={styles["heroLogo"]} alt="BB Logo" />
        </div>

        <h1>
          <span className={styles["firstName"]}>Bradley</span>{" "}
          <span className={"nobr"}>
            <BarberPole className={styles["barberPole"]} />{" "}
            <span className={styles["lastName"]}>Baysinger</span>
          </span>
        </h1>

        <h5 className={`${styles["subhead"]}`}>
          Interactive&nbsp;Web <span className={styles["bull"]}>&bull;</span>{" "}
          <span className={"nobr"}>Front-end Developer</span>
        </h5>
      </div>
      <ParagraphAnimator paragraphs={quotes} className={styles["message"]} />
      <div className={styles["ctaWrapper"]}>
        <a href="#hello" className={styles["cta"]}>
          <div className={styles["ctaText"]}>2. Say hello</div>
        </a>
      </div>
    </header>
  );
};

export default Hero;
