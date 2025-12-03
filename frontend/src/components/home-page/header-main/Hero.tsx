"use client";

import clsx from "clsx";
import Link from "next/link";
import React, { useState, useCallback, useRef, useEffect } from "react";
import { Suspense } from "react";

import FPSCounter from "@/components/common/FPSCounter";
import ChargedCircle from "@/components/home-page/header-main/ChargedCircle";
import OrbGrabTooltip from "@/components/home-page/header-main/OrbGrabTooltip";
import OrbTossTooltip from "@/components/home-page/header-main/OrbTossTooltip";
import useClientDimensions from "@/hooks/useClientDimensions";
import useScrollPersistedClass from "@/hooks/useScrollPersistedClass";
import useTimeOfDay from "@/hooks/useTimeOfDay";

import BorderBlinker, { Side } from "./BorderBlinker";
import GridController, {
  GridControllerHandle,
} from "./fluxel-grid/GridController";
import { Direction } from "./fluxel-grid/useFluxelProjectiles";
import styles from "./Hero.module.scss";
import HeroQueryConfig from "./HeroQueryConfig";
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
 * The homepage hero section, featuring a dynamic Fluxel grid and physics-based "Slinger" interaction.
 * Includes branding, animated tooltips, project nav triggers, and a kinetic interactive environment
 * for engaging the user visually and experientially.
 *
 * This component overlays a logo and interactive text over a Fluxel grid background. Users can drag
 * the Slinger (a draggable orb), triggering shadow and projectile effects on the grid, with behavior
 * controlled by query string parameters (e.g., `?useSlingerTracking=true`).
 *
 * Additional elements include:
 * - FPS counter for performance awareness
 * - Time-aware greeting and quote rotation
 * - Scroll-to-next-section CTA
 *
 * ⚠️ Requires rendering inside a `<Suspense>` boundary due to `useQueryParams()` (which uses `useSearchParams()`).
 * This is essential for compatibility with `next export` and the App Router.
 *
 * @component
 * @returns {JSX.Element} Hero header with grid and interactive branding.
 */
const Hero: React.FC = () => {
  const id = "hero";
  const initialRows = 12;
  const initialCols = 16;
  const slingerRef = useRef<SlingerBoxHandle>(null);

  const [blinkSides, setHighlightSides] = useState<Side[]>([]);
  const [isSlingerIdle, setIsSlingerIdle] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [circlePaused, setCirclePaused] = useState(true);
  const [_slingerPos, setSlingerPos] = useState<
    { x: number; y: number } | null | undefined
  >(undefined);
  const [hasDragged, setHasDragged] = useState<boolean>(false);
  const [hasCollided, setHasCollided] = useState<boolean>(false);
  const [hasAfterCollidedDelay, setHasAfterCollidedDelay] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  const timeOfDay = useTimeOfDay();
  const hasScrolledOut = useScrollPersistedClass(id);

  const titleRef = useRef<HTMLDivElement>(null);
  const slingerIsIdle = useRef(false);
  const gridControllerRef = useRef<GridControllerHandle>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  // Still measuring client dimensions (may be useful for future responsive heuristics),
  // but currently not required by GridController since it handles viewport internally.
  const { clientHeight: _clientHeight, clientWidth: _clientWidth } =
    useClientDimensions();
  const [isSlingerInFlight, setIsSlingerInFlight] = useState(false);
  const slingerLoopId = useRef<number | null>(null);
  // const useSlingerTracking = useQueryParams<boolean>("useSlingerTracking");
  const [useSlingerTracking, setUseSlingerTracking] = useState(false);

  const updateHasDragged = useCallback((value: boolean) => {
    sessionStorage.setItem("hasDragged", value ? "true" : "false");
    setHasDragged(value);
  }, []);

  // Derived interaction instruction fragment (kept small & focused for reuse and potential localization)
  const orbInstruction = isTouchDevice
    ? "Touch and drag to grab the orb — release to toss it around."
    : "Click and drag to grab the orb — release to toss it around.";

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

        // Persist and reflect collision immediately so the tooltip is hidden right away
        // Do not gate the state update behind sessionStorage; it may already be true from a prior session
        sessionStorage.setItem("hasCollided", "true");
        setHasCollided(true);
        // Scheduling this repeatedly is harmless; state is idempotent once true
        setTimeout(() => {
          // After a short post-collision delay, mark the milestone that allows the scroll CTA to appear
          setHasAfterCollidedDelay(true);
          // Persist within the current browser session so a reload (but not a full new session) retains the CTA state
          try {
            sessionStorage.setItem("hasAfterCollidedDelay", "true");
          } catch {
            // Ignore (e.g., storage disabled)
          }
        }, 2000);

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
    const mountRaf = requestAnimationFrame(() => setMounted(true));
    let hydrationRaf: number | null = null;

    // Hydrate persisted flags regardless of tracking mode
    if (typeof window !== "undefined") {
      const dragged = sessionStorage.getItem("hasDragged") === "true";
      const collided = sessionStorage.getItem("hasCollided") === "true";
      const afterDelay =
        sessionStorage.getItem("hasAfterCollidedDelay") === "true";
      let touchDevice = false;
      // Detect coarse pointer / touch-capable devices for tailored interaction instructions
      try {
        touchDevice =
          "ontouchstart" in window ||
          navigator.maxTouchPoints > 0 ||
          window.matchMedia("(pointer: coarse)").matches;
      } catch {
        touchDevice = false;
      }

      hydrationRaf = requestAnimationFrame(() => {
        setHasDragged(dragged);
        setHasCollided(collided);
        if (afterDelay) {
          setHasAfterCollidedDelay(true);
        }
        setIsTouchDevice(touchDevice);
      });
    }

    // Only start the tracking loop if enabled
    if (useSlingerTracking) {
      startSlingerTracking();
    }

    return () => {
      cancelAnimationFrame(mountRaf);
      if (hydrationRaf) cancelAnimationFrame(hydrationRaf);
      if (slingerLoopId.current) cancelAnimationFrame(slingerLoopId.current);
    };
  }, [useSlingerTracking, startSlingerTracking]);

  const handleSuppressContextMenu: React.MouseEventHandler<HTMLElement> = (
    e,
  ) => {
    // Prevent default context menu on long-press/right-click to keep immersive interaction
    e.preventDefault();
  };

  return (
    <header
      id={id}
      ref={heroRef}
      data-nav="hero"
      onContextMenu={handleSuppressContextMenu}
      className={clsx(
        // Scoped module class + global hook for easier debugging/targeting
        styles.hero,
        "hero",
        // Only include global state flags (avoid referencing undefined CSS-module keys)
        {
          isSlingerIdle,
          notSlingerIdle: !isSlingerIdle,
          hasScrolledOut,
          notScrolledOut: !hasScrolledOut,
          hasDragged,
          notDragged: !hasDragged,
          hasAfterCollidedDelay,
          notAfterCollidedDelay: !hasAfterCollidedDelay,
          hasCollided,
          notCollided: !hasCollided,
          hasMounted: mounted,
          notMounted: !mounted,
          slingerInFlight: isSlingerInFlight,
          slingerNotInFlight: !isSlingerInFlight,
        },
      )}
    >
      <Suspense fallback={null}>
        <HeroQueryConfig onUpdate={setUseSlingerTracking} />
      </Suspense>
      <div>
        <GridController
          useSlingerTracking={useSlingerTracking}
          className={styles.gridController}
          ref={gridControllerRef}
          rows={initialRows}
          cols={initialCols}
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
              {/* These get nested for offset/position once projected */}
              <ChargedCircle isActive={!circlePaused && !isSlingerInFlight} />
              <OrbGrabTooltip hidden={hasCollided} />
              <OrbTossTooltip hidden={hasCollided} />
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
          introMessage={`Good ${timeOfDay}. This is a kinetic UI exploration where design, code, and physics collide. ${orbInstruction} You're part of the experiment now.`}
          paragraphs={quotes}
          className={styles.message}
          paused={!mounted || !isSlingerIdle}
        ></ParagraphAnimator>
        <FPSCounter />
        <TitleBranding className={styles.titleBranding} ref={titleRef} />
      </div>
    </header>
  );
};

export default Hero;
