import React, { useState, useCallback, useRef, useEffect } from "react";

import { useResizeObserverHeight } from "hooks/useResizeObserverHeight";
import useClientDimensions from "hooks/useClientDimensions";
import GridController, {
  GridControllerHandle,
} from "./fluxel-grid/GridController";
import SlingerBox, { SlingerBoxHandle } from "./SlingerBox";
import ParagraphAnimator from "./ParagraphAnimator";
import useScrollPersistedClass from "hooks/useScrollPersistedClass";
import BorderBlinker, { Side } from "./BorderBlinker";
import { Direction } from "./fluxel-grid/useFluxelProjectiles";
import styles from "./Hero.module.scss";
import ChargedCircle from "components/home-page/header-main/ChargedCircle";
import useTimeOfDay from "hooks/useTimeOfDay";
import TitleBranding from "./TitleBranding";

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
  "Responsiveness isn't just about screen sizes — it's about responding to users' needs, behaviors, and expectations in real-time.",
  "Microinteractions are the punctuation marks of user experience. They add rhythm, personality, and meaning to an interface.",
  "Front-end development is the art of making complexity disappear, turning intricate logic into a seamless and intuitive experience.",
  "A well-designed interface is like a well-told story — every detail matters, and every interaction should feel intentional.",
  "Interfaces should be designed with curiosity in mind. If the user wants to explore, let them — and reward them for doing so.",
];

/**
 * Hero
 *
 * @author Bradley Baysinger
 * @since The beginning of time.
 * @version N/A
 */
const Hero: React.FC = () => {
  // Constants
  const id = "hero";
  const initialRows = 12;
  const initialCols = 16;
  const slingerRef = useRef<SlingerBoxHandle>(null);
  const usePointerTracking = true; // ← or false to test pointer tracking

  // State
  const [highlightSides, setHighlightSides] = useState<Side[]>([]);
  const [isSlingerIdle, setIsSlingerIdle] = useState(false);
  const [hasSlung, setHasSlung] = useState(false);
  const [_slingerPos, setSlingerPos] = useState<
    { x: number; y: number } | null | undefined
  >(undefined);
  const [hasDragged, _setHasDragged] = useState<boolean>(
    () => sessionStorage.getItem("hasDragged") === "true",
  );
  const [hasDraggedDelay, setHasDraggedDelay] = useState(
    () => sessionStorage.getItem("hasDragged") === "true",
  );

  // Refs
  const hasCalledFirstIdleAction = useRef(false);
  const idleCount = useRef(0);
  const timeOfDay = useTimeOfDay();
  const hasScrolledOut = useScrollPersistedClass(id);
  const titleRef = useRef<HTMLDivElement>(null);
  const titleHeight = useResizeObserverHeight(titleRef);
  const slingerIsIdle = useRef(false);
  const gridControllerRef = useRef<GridControllerHandle>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const { clientHeight, clientWidth } = useClientDimensions();

  const setHasDragged = useCallback((value: boolean) => {
    sessionStorage.setItem("hasDragged", value ? "true" : "false");
    _setHasDragged(value);
    setTimeout(() => {
      setHasDraggedDelay(value);
    }, 1000);
  }, []);

  const onSlingerDragStart = useCallback(
    (x: number, y: number, e: MouseEvent | TouchEvent) => {
      slingerIsIdle.current = false;
      setIsSlingerIdle(false);

      if (!hasDragged) {
        setHasDragged(true);
      }

      if (e.type === "touchmove" && gridControllerRef.current) {
        setSlingerPos({ x: x, y: y });
      }
    },
    [hasDragged, setHasDragged],
  );

  const onSlingerDragEnd = useCallback(
    (_x: number, _y: number, e: MouseEvent | TouchEvent) => {
      if (e.type === "touchend") {
        setSlingerPos(null);
      }
    },
    [],
  );

  const onSlingerWallCollision = useCallback(
    (wall: Side, x: number, y: number) => {
      if (!slingerIsIdle.current) {
        setHighlightSides((prev) => [...prev, wall]);

        let direction: Direction | null = null;

        switch (wall) {
          case "left":
            direction = "right";
            break;
          case "right":
            direction = "left";
            break;
          case "top":
            direction = "down";
            break;
          case "bottom":
            direction = "up";
            break;
        }

        gridControllerRef.current?.launchProjectile(x, y, direction);
      }
    },
    [gridControllerRef, slingerIsIdle],
  );

  const onSlingerIdle = useCallback(() => {
    slingerIsIdle.current = true;
    setIsSlingerIdle(true);

    idleCount.current += 1;

    if (idleCount.current === 2 && !hasCalledFirstIdleAction.current) {
      hasCalledFirstIdleAction.current = true;

      sessionStorage.setItem("hasSlung", "true");
      setHasSlung(true);
    }
  }, []);

  useEffect(() => {
    if (usePointerTracking) return;

    let animationFrameId: number;

    const animate = () => {
      const pos = slingerRef.current?.getSlingerPosition?.();
      if (pos) {
        gridControllerRef.current?.applyFluxPosition(pos.x, pos.y);
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, [usePointerTracking]);

  return (
    <header
      id={id}
      ref={heroRef}
      className={[
        styles.hero,
        hasScrolledOut && styles.hasScrolledOut,
        isSlingerIdle && `${styles.isSlingerIdle} isSlingerIdle`,
        !isSlingerIdle && `${styles.notSlingerIdle} notSlingerIdle`,
        hasDragged
          ? `${styles.hasDragged} hasDragged`
          : `${styles.notDragged} notDragged`,
        hasDraggedDelay
          ? `${styles.hasDraggedDelay} hasDraggedDelay`
          : `${styles.notDraggedDelay} notDraggedDelay`,
        hasSlung
          ? `${styles.hasSlung} hasSlung`
          : `${styles.notSlung} notSlung`,
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ minHeight: `${clientHeight}px` }}
    >
      <div>
        <GridController
          usePointerTracking={usePointerTracking}
          className={styles.gridController}
          ref={gridControllerRef}
          rows={initialRows}
          cols={initialCols}
          viewableWidth={clientWidth}
          viewableHeight={clientHeight}
        />
        <BorderBlinker
          className={styles.borderBlinker}
          highlightSides={highlightSides}
        />
        <div className={styles.slingerWrapper}>
          <SlingerBox
            ref={slingerRef}
            onDragStart={onSlingerDragStart}
            onDragEnd={onSlingerDragEnd}
            onWallCollision={onSlingerWallCollision}
            onIdle={onSlingerIdle}
          >
            <ChargedCircle />
          </SlingerBox>
        </div>

        <div className={styles.scrollCtaWrapper}>
          <a href="#hello" className={styles.scrollCta}>
            <div className={styles.scrollCtaInner}>Say hello!</div>
          </a>
        </div>
      </div>
      <TitleBranding className={styles.titleBranding} ref={titleRef} />
      <ParagraphAnimator
        style={{
          top: titleHeight
            ? `${window.innerHeight - titleHeight - 38}px`
            : "0px",
          width: titleHeight
            ? `${window.innerHeight - titleHeight - 56}px`
            : "0px",
        }}
        introMessage={[
          `Good ${timeOfDay}`,
          `. This is a kinetic UI Experiment. Grab the orb and then give it a toss for fun surprises!`,
        ].join("")}
        paragraphs={quotes}
        className={styles.message}
      />
    </header>
  );
};

export default Hero;
