import clsx from "clsx";
import Link from "next/link";
import React, { useState, useCallback, useRef, useEffect } from "react";

import FPSCounter from "@/components/common/FPSCounter";
import ChargedCircle from "@/components/home-page/header-main/ChargedCircle";
import OrbArrowTooltip from "@/components/home-page/header-main/OrbArrowTooltip";
import useClientDimensions from "@/hooks/useClientDimensions";
import useQueryParams from "@/hooks/useQueryParams";
import useScrollPersistedClass from "@/hooks/useScrollPersistedClass";
import useTimeOfDay from "@/hooks/useTimeOfDay";

import BorderBlinker, { Side } from "./BorderBlinker";
import GridController, {
  GridControllerHandle,
} from "./fluxel-grid/GridController";
import { Direction } from "./fluxel-grid/useFluxelProjectiles";
import styles from "./Hero.module.scss";
import ParagraphAnimator from "./ParagraphAnimator";
import SlingerBox, { SlingerBoxHandle } from "./SlingerBox";
import TitleBranding from "./TitleBranding";

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
 * Interactive slinger and fluxel grid overlaid with branding graphics on the home page.
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
  const [circlePaused, setCirclePaused] = useState(true);
  const [_slingerPos, setSlingerPos] = useState<
    { x: number; y: number } | null | undefined
  >(undefined);
  const [hasDragged, setHasDragged] = useState<boolean>(false);
  const [hasSlung, setHasSlung] = useState<boolean>(false);
  const [hasSlungDelay, setHasSlungDelay] = useState(false);

  const timeOfDay = useTimeOfDay();
  const hasScrolledOut = useScrollPersistedClass(id);

  const titleRef = useRef<HTMLDivElement>(null);
  const slingerIsIdle = useRef(false);
  const gridControllerRef = useRef<GridControllerHandle>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const { clientHeight, clientWidth } = useClientDimensions();
  const [isSlingerInFlight, setIsSlingerInFlight] = useState(false);
  const slingerLoopId = useRef<number | null>(null);
  const useSlingerTracking = useQueryParams<boolean>("useSlingerTracking");

  const updateHasDragged = useCallback((value: boolean) => {
    sessionStorage.setItem("hasDragged", value ? "true" : "false");
    setHasDragged(value);
  }, []);

  const onSlingerDragStart = useCallback(
    (x: number, y: number, e: MouseEvent | TouchEvent) => {
      if (circlePaused) setCirclePaused(false); // unpause only on drag start
      slingerIsIdle.current = false;
      setIsSlingerIdle(false);
      setIsSlingerInFlight(false);

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
    [circlePaused, hasDragged, updateHasDragged, useSlingerTracking],
  );

  const onSlingerDragEnd = useCallback(
    (_x: number, _y: number, e: MouseEvent | TouchEvent) => {
      setCirclePaused(true); // ✅ pause only on drag end
      setIsSlingerInFlight(true);

      if (e.type === "touchend") {
        setSlingerPos(null);
      }
      if (useSlingerTracking) {
        gridControllerRef.current?.resetAllFluxels?.();
      }
    },
    [useSlingerTracking],
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

  const startSlingerTracking = useCallback(() => {
    const animate = () => {
      if (isSlingerInFlight) return;
      const pos = slingerRef.current?.getSlingerPosition?.();
      if (pos) {
        gridControllerRef.current?.applyFluxPosition(pos.x, pos.y);
      }
      slingerLoopId.current = requestAnimationFrame(animate);
    };
    slingerLoopId.current = requestAnimationFrame(animate);
  }, [isSlingerInFlight]);

  const onSlingerIdle = useCallback(() => {
    slingerIsIdle.current = true;
    setIsSlingerIdle(true);
    setIsSlingerInFlight(false);

    if (!useSlingerTracking) return;

    const pos = slingerRef.current?.getSlingerPosition?.();
    if (pos) {
      gridControllerRef.current?.applyFluxPosition(pos.x, pos.y);
    }
    gridControllerRef.current?.resumeShadows?.();
    startSlingerTracking();
  }, [startSlingerTracking, useSlingerTracking]);

  useEffect(() => {
    setMounted(true);

    if (!useSlingerTracking) return;
    startSlingerTracking();

    if (typeof window !== "undefined") {
      setHasDragged(sessionStorage.getItem("hasDragged") === "true");
      setHasSlung(sessionStorage.getItem("hasSlung") === "true");
    }

    return () => {
      if (slingerLoopId.current) cancelAnimationFrame(slingerLoopId.current);
    };
  }, [useSlingerTracking, startSlingerTracking]);

  return (
    <header
      id={id}
      ref={heroRef}
      data-nav="hero"
      className={clsx(
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
      )}
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
              <ChargedCircle isActive={!circlePaused && !isSlingerInFlight} />
              <OrbArrowTooltip className={isSlingerInFlight ? "hidden" : ""} />
            </>
          </SlingerBox>
        </div>
        <div className={styles.scrollCtaWrapper}>
          <Link href="#hello" className={styles.scrollCta}>
            <div className={styles.scrollCtaInner}>Say hello!</div>
          </Link>
        </div>
      </div>

      <div className={styles.foreground}>
        <ParagraphAnimator
          introMessage={`Good ${timeOfDay}. This is a kinetic UI experiment in development. Grab the orb, drag it around, then give it a toss for fun surprises!`}
          paragraphs={quotes}
          className={styles.message}
          paused={!mounted || !isSlingerIdle}
        >
          <FPSCounter />
        </ParagraphAnimator>
        <TitleBranding className={styles.titleBranding} ref={titleRef} />
      </div>
    </header>
  );
};

export default Hero;
