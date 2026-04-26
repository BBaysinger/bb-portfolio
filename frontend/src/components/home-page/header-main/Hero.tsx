"use client";

/**
 * Home page hero: an interactive "Fluxel" grid + draggable “Slinger” orb.
 *
 * Responsibilities:
 * - Renders the grid background and interactive orb container.
 * - Tracks interaction milestones (dragged/collided) in `sessionStorage`.
 * - Emits lightweight analytics events for toss interactions.
 * - Applies global state class hooks for CSS-driven transitions.
 *
 * Notes:
 * - Must render inside a `Suspense` boundary due to query-param hooks.
 * - `sessionStorage` access is guarded because some browsers/modes can throw.
 */

import clsx from "clsx";
import Link from "next/link";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";

import FPSCounter from "@/components/common/FPSCounter";
import ChargedCircle from "@/components/home-page/header-main/ChargedCircle";
import OrbGrabTooltip from "@/components/home-page/header-main/OrbGrabTooltip";
import OrbTossTooltip from "@/components/home-page/header-main/OrbTossTooltip";
import useScrollPersistedClass from "@/hooks/useScrollPersistedClass";
import useTimeOfDay from "@/hooks/useTimeOfDay";
import useStableViewportHeightVar, {
  STABLE_VIEWPORT_HEIGHT_MODES,
} from "@/hooks/viewport/useStableViewportHeightVar";
import useViewportSize from "@/hooks/viewport/useViewportSize";
import { recordGAEvent } from "@/services/ga";
import { recordEvent } from "@/services/rum";
import { detectOs, isEdge, isFirefox, isSafari } from "@/utils/browser";
import {
  HOME_HERO_INTRO_REPLAY_REQUESTED_EVENT,
  consumeHomeHeroIntroReplayRequest,
  shouldPlayHomeHeroIntroOnEntry,
} from "@/utils/homeHeroIntroReplay";

import BorderBlinker, { Side } from "./BorderBlinker";
import GridController, {
  GridControllerHandle,
} from "./fluxel-grid/GridController";
import { Direction } from "./fluxel-grid/useFluxelProjectiles";
import styles from "./Hero.module.scss";
import HeroLockup from "./HeroLockup";
import HeroQueryConfig from "./HeroQueryConfig";
import SlingerBox, { SlingerBoxHandle } from "./SlingerBox";
import TypewriterEffect from "./TypewriterEffect";

const quotes = [
  // General UI/UX
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

const parseEnvBooleanFlag = (value?: string | null) => {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === "1" || normalized === "true" || normalized === "on")
    return true;
  if (normalized === "0" || normalized === "false" || normalized === "off")
    return false;
  return null;
};

const envFpsFlag = parseEnvBooleanFlag(
  process.env.NEXT_PUBLIC_ENABLE_FPS_COUNTER,
);
const envProfile = (process.env.NEXT_PUBLIC_ENV_PROFILE || "")
  .trim()
  .toLowerCase();
const isDevLikeProfile = envProfile === "local" || envProfile === "dev";
const defaultFpsCounterEnabled =
  envFpsFlag ?? (isDevLikeProfile || process.env.NODE_ENV !== "production");

const MIN_SLINGER_RELEASE_SPEED = 210;
const MAX_SLINGER_RELEASE_SPEED = 500;
const MIN_SLINGER_RELEASE_SPEED_VIEWPORT = 320;
const MAX_SLINGER_RELEASE_SPEED_VIEWPORT = 1792; // My laptop

const getMaxSlingerReleaseSpeed = (viewportWidth: number | null) => {
  if (viewportWidth === null) return MAX_SLINGER_RELEASE_SPEED;
  if (viewportWidth <= MIN_SLINGER_RELEASE_SPEED_VIEWPORT) {
    return MIN_SLINGER_RELEASE_SPEED;
  }
  if (viewportWidth >= MAX_SLINGER_RELEASE_SPEED_VIEWPORT) {
    return MAX_SLINGER_RELEASE_SPEED;
  }

  const progress =
    (viewportWidth - MIN_SLINGER_RELEASE_SPEED_VIEWPORT) /
    (MAX_SLINGER_RELEASE_SPEED_VIEWPORT - MIN_SLINGER_RELEASE_SPEED_VIEWPORT);

  return Math.round(
    MIN_SLINGER_RELEASE_SPEED +
      (MAX_SLINGER_RELEASE_SPEED - MIN_SLINGER_RELEASE_SPEED) * progress,
  );
};

type HeroProps = {
  initialRoleTitle?: string;
};

type ViewportDebugSnapshot = {
  stableHeightPx: number | null;
  visualViewportHeight: number | null;
  innerHeight: number | null;
  clientHeight: number | null;
};

const roundViewportValue = (value: number | null | undefined) => {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return null;
  }

  return Math.round(value);
};

const getViewportDebugSnapshot = (
  stableHeightPx: number | null,
): ViewportDebugSnapshot => {
  if (typeof window === "undefined") {
    return {
      stableHeightPx,
      visualViewportHeight: null,
      innerHeight: null,
      clientHeight: null,
    };
  }

  return {
    stableHeightPx,
    visualViewportHeight: roundViewportValue(window.visualViewport?.height),
    innerHeight: roundViewportValue(window.innerHeight),
    clientHeight: roundViewportValue(document.documentElement?.clientHeight),
  };
};

function Hero({ initialRoleTitle }: HeroProps) {
  const id = "hero";
  const initialRows = 12;
  const initialCols = 16;
  const slingerRef = useRef<SlingerBoxHandle>(null);

  const [blinkSides, setBlinkSides] = useState<Side[]>([]);
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
  const [fpsOverride, setFpsOverride] = useState<boolean | null>(null);
  const [playHeroIntro, setPlayHeroIntro] = useState(false);
  const [heroRuntimeKey, setHeroRuntimeKey] = useState(0);
  // TODO(viewport-debug-cleanup): Remove this temporary hero viewport-debug state once the iOS Safari height issue is resolved.
  const [showViewportDebug, setShowViewportDebug] = useState(false);
  const [, bumpViewportDebugVersion] = useReducer(
    (value: number) => value + 1,
    0,
  );

  const timeOfDay = useTimeOfDay();
  const hasScrolledOut = useScrollPersistedClass(id);

  const titleRef = useRef<HTMLDivElement>(null);
  const slingerIsIdle = useRef(false);
  const gridControllerRef = useRef<GridControllerHandle>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const isSlingerInFlightRef = useRef(false);

  const stableHeightPx = useStableViewportHeightVar(heroRef, {
    cssVarName: "--hero-stable-vh",
    mode: STABLE_VIEWPORT_HEIGHT_MODES.USE_WHERE_REQUIRED,
    heightOnlyResizePolicy: "pointer-fine-or-shrink",
  });

  const [isSlingerInFlight, setIsSlingerInFlight] = useState(false);
  const slingerLoopId = useRef<number | null>(null);
  const [useSlingerTracking, setUseSlingerTracking] = useState(false);
  const { width: viewportWidth } = useViewportSize();
  const showFpsCounter =
    fpsOverride !== null ? fpsOverride : defaultFpsCounterEnabled;
  const maxSlingerReleaseSpeed = useMemo(
    () => getMaxSlingerReleaseSpeed(viewportWidth),
    [viewportWidth],
  );
  const viewportHeightMode = stableHeightPx === null ? "svh" : "managed";
  const viewportBrowserLabel = useMemo(() => {
    if (!mounted || typeof window === "undefined") return "unknown";

    const os = detectOs();
    if (isFirefox()) return `${os}-firefox`;
    if (isEdge()) return `${os}-edge`;
    if (isSafari()) return `${os}-safari`;
    return os;
  }, [mounted]);
  const viewportDebugSnapshot =
    showViewportDebug && typeof window !== "undefined"
      ? getViewportDebugSnapshot(stableHeightPx)
      : null;
  const viewportDebugSummary = useMemo(() => {
    if (!viewportDebugSnapshot) return null;

    return [
      `mode:${viewportHeightMode}`,
      `stable:${viewportDebugSnapshot.stableHeightPx ?? "-"}`,
      `vv:${viewportDebugSnapshot.visualViewportHeight ?? "-"}`,
      `inner:${viewportDebugSnapshot.innerHeight ?? "-"}`,
      `client:${viewportDebugSnapshot.clientHeight ?? "-"}`,
      viewportBrowserLabel,
    ].join(" ");
  }, [viewportBrowserLabel, viewportDebugSnapshot, viewportHeightMode]);

  // useEffect(() => {
  //   if (viewportWidth === null) return;

  //   console.log("maxSlingerReleaseSpeed", {
  //     viewportWidth,
  //     maxSlingerReleaseSpeed,
  //   });
  // }, [maxSlingerReleaseSpeed, viewportWidth]);

  const updateHasDragged = useCallback((value: boolean) => {
    try {
      sessionStorage.setItem("hasDragged", value ? "true" : "false");
    } catch {
      // Ignore (e.g., storage disabled)
    }
    setHasDragged(value);
  }, []);

  // Derived interaction instruction fragment (kept small & focused for reuse and potential localization)
  const orbInstruction = isTouchDevice
    ? "Touch and drag to grab the orb — release to toss it around."
    : "Click and drag to grab the orb — release to toss it around.";
  const heroIntroMessage = useMemo(
    () =>
      `Good ${timeOfDay}. This is a kinetic UI exploration where design, code, and physics collide. ${orbInstruction} You're part of the experiment now.`,
    [orbInstruction, timeOfDay],
  );
  const heroParagraphs = useMemo(
    () => (playHeroIntro ? [heroIntroMessage] : quotes),
    [heroIntroMessage, playHeroIntro],
  );

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
    (vx: number, vy: number, e: MouseEvent | TouchEvent) => {
      setCirclePaused(true); // ✅ pause only on drag end
      setIsSlingerInFlight(true);

      // Track toss interactions in CloudWatch RUM (production only; no-op locally).
      // Keep metadata small and non-identifying.
      recordEvent("slinger_toss", {
        inputType: e.type.startsWith("touch") ? "touch" : "mouse",
        vx,
        vy,
        speed: Math.hypot(vx, vy),
        hasCollided,
        page:
          typeof window !== "undefined" ? window.location.pathname : undefined,
      });

      // Track toss interactions in GA4 (enabled only when NEXT_PUBLIC_GA_MEASUREMENT_ID is set).
      // Keep metadata small and non-identifying.
      recordGAEvent("slinger_toss", {
        inputType: e.type.startsWith("touch") ? "touch" : "mouse",
        vx,
        vy,
        speed: Math.hypot(vx, vy),
        hasCollided,
        page:
          typeof window !== "undefined" ? window.location.pathname : undefined,
      });

      if (e.type === "touchend") {
        setSlingerPos(null);
      }
      if (useSlingerTracking) {
        gridControllerRef.current?.resetAllFluxels?.();
      }
    },
    [hasCollided, useSlingerTracking],
  );

  const onSlingerWallCollision = useCallback(
    (wall: Side, x: number, y: number) => {
      if (!slingerIsIdle.current) {
        setBlinkSides((prev) => [...prev, wall]);

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
        try {
          sessionStorage.setItem("hasCollided", "true");
        } catch {
          // Ignore (e.g., storage disabled)
        }
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
      if (isSlingerInFlightRef.current) return;
      const pos = slingerRef.current?.getSlingerPosition?.();
      if (pos) {
        gridControllerRef.current?.applyFluxPosition(pos.x, pos.y);
      }
      slingerLoopId.current = requestAnimationFrame(animate);
    };
    slingerLoopId.current = requestAnimationFrame(animate);
  }, []);

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
    isSlingerInFlightRef.current = isSlingerInFlight;
  }, [isSlingerInFlight]);

  const restartHeroRuntime = useCallback(() => {
    if (slingerLoopId.current) {
      cancelAnimationFrame(slingerLoopId.current);
      slingerLoopId.current = null;
    }

    slingerIsIdle.current = true;
    setBlinkSides([]);
    setCirclePaused(true);
    setIsSlingerIdle(true);
    setIsSlingerInFlight(false);
    setSlingerPos(undefined);
    setHeroRuntimeKey((current) => current + 1);

    if (!useSlingerTracking) return;

    requestAnimationFrame(() => {
      startSlingerTracking();
    });
  }, [startSlingerTracking, useSlingerTracking]);

  useEffect(() => {
    const shouldReplayIntro = shouldPlayHomeHeroIntroOnEntry();

    const mountRaf = requestAnimationFrame(() => setMounted(true));
    let hydrationRaf: number | null = null;

    // Hydrate persisted flags regardless of tracking mode
    if (typeof window !== "undefined") {
      let dragged = false;
      let collided = false;
      let afterDelay = false;
      try {
        dragged = sessionStorage.getItem("hasDragged") === "true";
        collided = sessionStorage.getItem("hasCollided") === "true";
        afterDelay = sessionStorage.getItem("hasAfterCollidedDelay") === "true";
      } catch {
        // Ignore (e.g., storage disabled)
      }
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
        setPlayHeroIntro(shouldReplayIntro);
        setHasDragged(dragged);
        setHasCollided(collided);
        if (afterDelay) {
          setHasAfterCollidedDelay(true);
        }
        setIsTouchDevice(touchDevice);
      });
    }

    return () => {
      cancelAnimationFrame(mountRaf);
      if (hydrationRaf) cancelAnimationFrame(hydrationRaf);
    };
  }, []);

  useEffect(() => {
    if (!useSlingerTracking) {
      if (slingerLoopId.current) {
        cancelAnimationFrame(slingerLoopId.current);
        slingerLoopId.current = null;
      }
      return;
    }

    startSlingerTracking();

    return () => {
      if (slingerLoopId.current) {
        cancelAnimationFrame(slingerLoopId.current);
        slingerLoopId.current = null;
      }
    };
  }, [startSlingerTracking, useSlingerTracking]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const replayHeroIntroIfRequested = () => {
      const shouldReplay = consumeHomeHeroIntroReplayRequest();
      if (!shouldReplay) return;

      restartHeroRuntime();
      setPlayHeroIntro(true);
    };

    const onPageShow = (event: PageTransitionEvent) => {
      if (!event.persisted) return;

      replayHeroIntroIfRequested();
    };

    window.addEventListener(
      HOME_HERO_INTRO_REPLAY_REQUESTED_EVENT,
      replayHeroIntroIfRequested,
    );
    window.addEventListener("pageshow", onPageShow);

    return () => {
      window.removeEventListener(
        HOME_HERO_INTRO_REPLAY_REQUESTED_EVENT,
        replayHeroIntroIfRequested,
      );
      window.removeEventListener("pageshow", onPageShow);
    };
  }, [restartHeroRuntime]);

  useEffect(() => {
    if (!showViewportDebug) return;

    const updateViewportDebugSnapshot = () => {
      bumpViewportDebugVersion();
    };

    const visualViewport = window.visualViewport;
    window.addEventListener("resize", updateViewportDebugSnapshot, {
      passive: true,
    });
    window.addEventListener("orientationchange", updateViewportDebugSnapshot, {
      passive: true,
    });
    window.addEventListener("scroll", updateViewportDebugSnapshot, {
      passive: true,
    });
    visualViewport?.addEventListener("resize", updateViewportDebugSnapshot, {
      passive: true,
    });
    visualViewport?.addEventListener("scroll", updateViewportDebugSnapshot, {
      passive: true,
    });

    return () => {
      window.removeEventListener("resize", updateViewportDebugSnapshot);
      window.removeEventListener(
        "orientationchange",
        updateViewportDebugSnapshot,
      );
      window.removeEventListener("scroll", updateViewportDebugSnapshot);
      visualViewport?.removeEventListener(
        "resize",
        updateViewportDebugSnapshot,
      );
      visualViewport?.removeEventListener(
        "scroll",
        updateViewportDebugSnapshot,
      );
    };
  }, [showViewportDebug]);

  const handleHeroParagraphComplete = useCallback(() => {
    if (!playHeroIntro) return;

    setPlayHeroIntro(false);
    return false;
  }, [playHeroIntro]);

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
      // TODO(viewport-debug-cleanup): Remove these temporary debug attributes after viewport-height investigation is complete.
      data-viewport-height-mode={viewportHeightMode}
      data-viewport-browser={viewportBrowserLabel}
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
        {/* TODO(viewport-debug-cleanup): Remove temporary query-param wiring used to toggle hero viewport diagnostics. */}
        <HeroQueryConfig
          onUpdate={setUseSlingerTracking}
          onFpsOverride={setFpsOverride}
          onViewportDebugOverride={setShowViewportDebug}
        />
      </Suspense>
      {showViewportDebug && viewportDebugSummary ? (
        // TODO(viewport-debug-cleanup): Remove temporary on-page viewport debug overlay after Safari investigation.
        <div className={styles.viewportDebug} aria-live="polite">
          {viewportDebugSummary}
        </div>
      ) : null}
      <div>
        <GridController
          key={`grid-${heroRuntimeKey}`}
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
            key={`slinger-${heroRuntimeKey}`}
            ref={slingerRef}
            onDragStart={onSlingerDragStart}
            onDragEnd={onSlingerDragEnd}
            onWallCollision={onSlingerWallCollision}
            onIdle={onSlingerIdle}
            maxReleaseSpeed={maxSlingerReleaseSpeed}
          >
            <>
              {/* These get nested for offset/position once projected */}
              <ChargedCircle
                isActive={!circlePaused && !isSlingerInFlight}
                isUnlocked={hasCollided}
              />
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
        {mounted ? (
          <TypewriterEffect
            key={`typewriter-${heroRuntimeKey}-${playHeroIntro ? "intro" : "quotes"}`}
            paragraphs={heroParagraphs}
            className={styles.message}
            onParagraphComplete={handleHeroParagraphComplete}
          />
        ) : null}
        {showFpsCounter && <FPSCounter />}
        <HeroLockup
          className={styles.titleBranding}
          ref={titleRef}
          initialRoleTitle={initialRoleTitle}
        />
      </div>
    </header>
  );
}

export default Hero;
