import React, { useState, useCallback, useRef, useEffect } from "react";

import useClientDimensions from "hooks/useClientDimensions";
import GridController, {
  GridControllerHandle,
} from "./fluxel-grid/GridController";
import SlingerBox, { SlingerBoxHandle } from "./SlingerBox";
import ParagraphAnimator from "./ParagraphAnimator";
import useScrollPersistedClass from "hooks/useScrollPersistedClass";
import BorderBlinker, { Side } from "./BorderBlinker";
import { Direction } from "./fluxel-grid/useFluxelProjectiles";
import ChargedCircle from "components/home-page/header-main/ChargedCircle";
import useTimeOfDay from "hooks/useTimeOfDay";
import TitleBranding from "./TitleBranding";
import useQueryParams from "hooks/useQueryParams";
import useFPS from "hooks/useFPS";
import OrbArrowTooltip from "components/home-page/header-main/OrbArrowTooltip";
import styles from "./Hero.module.scss";

const quotes = [
  "Interactivity is not about clicking, tapping, or swiping. It's about engagement — an invitation to explore, respond, and shape the experience.",
  "A great UI isn't just seen — it's felt. Every transition, every hover, every microinteraction should whisper to the user: 'I understand you'.",
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
  const id = "hero";
  const initialRows = 12;
  const initialCols = 16;
  const slingerRef = useRef<SlingerBoxHandle>(null);

  const [blinkSides, setHighlightSides] = useState<Side[]>([]);
  const [isSlingerIdle, setIsSlingerIdle] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [_slingerPos, setSlingerPos] = useState<
    { x: number; y: number } | null | undefined
  >(undefined);
  const [hasDragged, setHasDragged] = useState<boolean>(
    () => sessionStorage.getItem("hasDragged") === "true",
  );
  const [hasSlung, setHasSlung] = useState<boolean>(
    () => sessionStorage.getItem("hasSlung") === "true",
  );
  const [hasSlungDelay, setHasSlungDelay] = useState(
    // Always start the same value as hasDragged
    () => sessionStorage.getItem("hasSlung") === "true",
  );

  const timeOfDay = useTimeOfDay();
  const hasScrolledOut = useScrollPersistedClass(id);
  const titleRef = useRef<HTMLDivElement>(null);
  const slingerIsIdle = useRef(false);
  const gridControllerRef = useRef<GridControllerHandle>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const { clientHeight, clientWidth } = useClientDimensions();
  const isSlingerInFlight = useRef(false);
  const slingerLoopId = useRef<number | null>(null);
  const useSlingerTracking = useQueryParams<boolean>("useSlingerTracking");
  const fps = useFPS();

  const updateHasDragged = useCallback((value: boolean) => {
    sessionStorage.setItem("hasDragged", value ? "true" : "false");
    setHasDragged(value);
  }, []);

  const onSlingerDragStart = useCallback(
    (x: number, y: number, e: MouseEvent | TouchEvent) => {
      slingerIsIdle.current = false;
      setIsSlingerIdle(false);
      isSlingerInFlight.current = false;

      if (!hasDragged) {
        updateHasDragged(true);
      }

      if (e.type === "touchmove" && gridControllerRef.current) {
        setSlingerPos({ x, y });
      }
      if (useSlingerTracking) {
        gridControllerRef.current?.resumeShadows?.();
      }
    },
    [hasDragged, updateHasDragged, useSlingerTracking],
  );

  const onSlingerDragEnd = useCallback(
    (_x: number, _y: number, e: MouseEvent | TouchEvent) => {
      isSlingerInFlight.current = true;
      if (e.type === "touchend") {
        setSlingerPos(null);
      }
      if (useSlingerTracking) {
        gridControllerRef.current?.resetAllFluxels?.();
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

        if (sessionStorage.getItem("hasSlung") !== "true") {
          sessionStorage.setItem("hasSlung", "true");
          setHasSlung(true);
          setTimeout(() => {
            setHasSlungDelay(true);
          }, 2000);
        }

        gridControllerRef.current?.launchProjectile(x, y, direction);
      }
    },
    [],
  );

  const startSlingerTracking = () => {
    const animate = () => {
      if (isSlingerInFlight.current) return;
      const pos = slingerRef.current?.getSlingerPosition?.();
      if (pos) {
        gridControllerRef.current?.applyFluxPosition(pos.x, pos.y);
      }
      slingerLoopId.current = requestAnimationFrame(animate);
    };
    slingerLoopId.current = requestAnimationFrame(animate);
  };

  const onSlingerIdle = useCallback(() => {
    slingerIsIdle.current = true;
    setIsSlingerIdle(true);
    isSlingerInFlight.current = false;

    if (!useSlingerTracking) return;

    const pos = slingerRef.current?.getSlingerPosition?.();
    if (pos) {
      gridControllerRef.current?.applyFluxPosition(pos.x, pos.y);
    }
    gridControllerRef.current?.resumeShadows?.();
    startSlingerTracking();
  }, []);

  useEffect(() => {
    setMounted(true);

    if (!useSlingerTracking) return;
    startSlingerTracking();

    return () => {
      if (slingerLoopId.current) cancelAnimationFrame(slingerLoopId.current);
    };
  }, [useSlingerTracking]);

  return (
    <header
      id={id}
      ref={heroRef}
      className={[
        `${styles.hero} hero`,
        isSlingerIdle
          ? `${styles.isSlingerIdle} isSlingerIdle`
          : `${styles.notSlingerIdle} notSlingerIdle`,
        hasScrolledOut
          ? `${styles.hasScrolledOut} hasScrolledOut`
          : `${styles.notScrolledOut} notScrolledOut`,
        hasDragged
          ? `${styles.hasDragged} hasDragged`
          : `${styles.notDragged} notDragged`,
        hasSlungDelay
          ? `${styles.hasSlungDelay} hasSlungDelay`
          : `${styles.notSlungDelay} notSlungDelay`,
        hasSlung
          ? `${styles.hasSlung} hasSlung`
          : `${styles.notSlung} notSlung`,
        mounted
          ? `${styles.hasMounted} hasMounted`
          : `${styles.notMounted} notMounted`,
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ minHeight: `${clientHeight}px` }}
    >
      <div>
        <GridController
          useSlingerTracking={useSlingerTracking}
          className={styles.gridController}
          ref={gridControllerRef}
          rows={initialRows}
          cols={initialCols}
          viewableWidth={clientWidth}
          viewableHeight={clientHeight}
        />
        <BorderBlinker
          className={styles.borderBlinker}
          blinkSides={blinkSides}
        />
        <div className={styles.slingerWrapper}>
          <SlingerBox
            ref={slingerRef}
            onDragStart={onSlingerDragStart}
            onDragEnd={onSlingerDragEnd}
            onWallCollision={onSlingerWallCollision}
            onIdle={onSlingerIdle}
          >
            <>
              <OrbArrowTooltip />
              <ChargedCircle />
            </>
          </SlingerBox>
        </div>
        <div className={styles.scrollCtaWrapper}>
          <a href="#hello" className={styles.scrollCta}>
            <div className={styles.scrollCtaInner}>Say hello!</div>
          </a>
        </div>
      </div>
      <div className={styles.foreground}>
        <ParagraphAnimator
          introMessage={`Good ${timeOfDay}. This is a kinetic UI Experiment. Grab the orb and then give it a toss for fun surprises!`}
          paragraphs={quotes}
          className={styles.message}
        />
        <TitleBranding className={styles.titleBranding} ref={titleRef} />
      </div>
      <div className={styles.fpsCounter}>FPS: {fps}</div>
    </header>
  );
};

export default Hero;
