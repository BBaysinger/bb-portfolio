"use client";

import clsx from "clsx";
import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";

import SpriteSheetPlayer from "@/components/common/sprite-rendering/SpriteSheetPlayer";

import styles from "./AnimationSequencer.module.scss";

// Sequencer-specific sprite overrides layered on top of the global sprite-player
// query params. Useful when you want to A/B fullscreen sequencer behavior while
// still being able to flip all sprite players together elsewhere.
// - `sequencerRenderStrategy=css|canvas|webgl`
// - `sequencerMaxDpr=<positive number>`
const SEQUENCER_RENDER_STRATEGY_QUERY_PARAM = "sequencerRenderStrategy";
const SEQUENCER_MAX_DPR_QUERY_PARAM = "sequencerMaxDpr";
const PRELOAD_STAGGER_MS = 150;
const MAX_RETAINED_PRELOADED_SHEETS = 12;

const preloadedSpriteSheetPromises = new Map<string, Promise<void>>();
const retainedPreloadedSpriteSheets = new Map<string, HTMLImageElement>();

const retainPreloadedSpriteSheet = (
  src: string,
  image: HTMLImageElement,
): void => {
  retainedPreloadedSpriteSheets.delete(src);
  retainedPreloadedSpriteSheets.set(src, image);

  while (retainedPreloadedSpriteSheets.size > MAX_RETAINED_PRELOADED_SHEETS) {
    const oldestKey = retainedPreloadedSpriteSheets.keys().next().value;
    if (!oldestKey) break;
    retainedPreloadedSpriteSheets.delete(oldestKey);
  }
};

const preloadSpriteSheet = (src: string): Promise<void> => {
  if (typeof window === "undefined") return Promise.resolve();

  const existingPromise = preloadedSpriteSheetPromises.get(src);
  if (existingPromise) return existingPromise;

  const preloadPromise = new Promise<void>((resolve) => {
    const image = new Image();
    image.decoding = "async";

    const finish = () => {
      retainPreloadedSpriteSheet(src, image);
      resolve();
    };

    image.onload = () => {
      if (typeof image.decode === "function") {
        image
          .decode()
          .catch(() => undefined)
          .finally(finish);
        return;
      }
      finish();
    };

    image.onerror = () => {
      preloadedSpriteSheetPromises.delete(src);
      resolve();
    };

    image.src = src;
  });

  preloadedSpriteSheetPromises.set(src, preloadPromise);
  return preloadPromise;
};

export interface AnimationSequencerHandle {
  playImperativeAnimation: (index?: number) => void;
}

export interface AnimationSequencerProps {
  className?: string;
}

interface AnimationMeta {
  wide: string;
  narrow: string;
  fps?: number;
  loops?: number;
  weight: number;
}

/**
 * Fluxel grid animation sequencer.
 *
 * Responsibilities:
 * - Plays weighted, randomized sprite-sheet animations after user inactivity.
 * - Allows imperative triggering via {@link AnimationSequencerHandle}.
 *
 * Implementation notes:
 * - Marked as a client component because it depends on viewport metrics (`window.innerWidth/innerHeight`).
 * - Uses a hidden-first mount then a `requestAnimationFrame` tick to avoid flashing frame 0.
 */
const AnimationSequencer = forwardRef<
  AnimationSequencerHandle,
  AnimationSequencerProps
>(({ className = "" }, ref) => {
  const [activeAnim, setActiveAnim] = useState<AnimationMeta | null>(null);
  const [animKey, setAnimKey] = useState(0);
  const [shouldPlay, setShouldPlay] = useState(false);

  // `setTimeout` return type differs between DOM and Node typings; keep it portable.
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPlayedIndexRef = useRef<number | null>(null);
  const startRafRef = useRef<number | null>(null);

  const delay = 15000;
  const initialDelay = 8000;
  const ratio = 40 / 33;
  const directory = "/spritesheets/fluxel-animations/";
  const extension = ".webp";

  const isNarrow = useCallback(() => {
    // Client components can still render on the server in Next.js.
    // When `window` is unavailable, default to the wide variant.
    if (typeof window === "undefined") return false;
    return window.innerWidth / window.innerHeight < ratio;
  }, [ratio]);

  const buildFullPath = (name: string) => `${directory}${name}${extension}`;

  const clearTimeoutIfSet = () => {
    if (timeoutRef.current == null) return;
    clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
  };

  const clearStartRafIfSet = () => {
    if (startRafRef.current !== null) {
      cancelAnimationFrame(startRafRef.current);
      startRafRef.current = null;
    }
  };

  const inactivityAnimations = useMemo<AnimationMeta[]>(
    () => [
      {
        wide: "invaders_w16h12f105",
        narrow: "invaders_w16h12f105",
        fps: 10,
        loops: 1,
        weight: 2,
      },
      {
        wide: "burst1_Layer-Comp-_w16h12f30",
        narrow: "burst1_Layer-Comp-_w16h12f30",
        fps: 10,
        loops: 1,
        weight: 1,
      },
      {
        wide: "interactive-web_w16h12f105",
        narrow: "interactive-web_w16h12f105",
        fps: 10,
        loops: 1,
        weight: 1,
      },
      {
        wide: "javascript-typescript_w16h12f142",
        narrow: "javascript-typescript_w16h12f142",
        fps: 10,
        loops: 1,
        weight: 2,
      },
      {
        wide: "mobile-first_w16h12f82",
        narrow: "mobile-first_w16h12f82",
        fps: 10,
        loops: 1,
        weight: 1,
      },
      {
        wide: "responsive-design_w16h12f121",
        narrow: "responsive-design_w16h12f121",
        fps: 10,
        loops: 1,
        weight: 1,
      },
      {
        wide: "single-page-application_w16h12f147",
        narrow: "single-page-application_w16h12f147",
        fps: 10,
        loops: 1,
        weight: 1,
      },
      {
        wide: "spiral-green-purp_w16h12f215",
        narrow: "spiral-green-purp_w16h12f215",
        fps: 30,
        loops: 1,
        weight: 2,
      },
      {
        wide: "user-experience_w16h12f109",
        narrow: "user-experience_w16h12f109",
        fps: 10,
        loops: 1,
        weight: 1,
      },
      {
        wide: "user-interface_w16h12f99",
        narrow: "user-interface_w16h12f99",
        fps: 10,
        loops: 1,
        weight: 1,
      },
      {
        wide: "runtime-optimization_w16h12f129",
        narrow: "runtime-optimization_w16h12f129",
        fps: 10,
        loops: 1,
        weight: 1,
      },
    ],
    [],
  );

  const inactivityAnimationSources = useMemo(() => {
    const uniqueSources = new Set<string>();

    for (const animation of inactivityAnimations) {
      uniqueSources.add(buildFullPath(animation.wide));
      uniqueSources.add(buildFullPath(animation.narrow));
    }

    return Array.from(uniqueSources);
  }, [inactivityAnimations]);

  const imperativeAnimations = useMemo<AnimationMeta[]>(
    // Reserved for future interaction-driven animations.
    // Keeping this empty makes imperative calls a no-op instead of trying to
    // load a bogus sprite path like `/spritesheets/.../.webp`.
    () => [],
    [],
  );

  const weightedRandomIndex = (
    items: AnimationMeta[],
    lastIndex: number | null,
  ): number => {
    const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
    let attemptCount = 0;

    while (attemptCount < 10) {
      const r = Math.random() * totalWeight;
      let cumulative = 0;

      for (let i = 0; i < items.length; i++) {
        cumulative += items[i].weight;
        if (r < cumulative) {
          if (i !== lastIndex) return i;
          break;
        }
      }

      attemptCount++;
    }

    const fallback = items.findIndex((_, i) => i !== lastIndex);
    return fallback >= 0 ? fallback : 0;
  };

  const getNextIndex = useCallback(() => {
    const index = weightedRandomIndex(
      inactivityAnimations,
      lastPlayedIndexRef.current,
    );
    lastPlayedIndexRef.current = index;
    return index;
  }, [inactivityAnimations]);

  const safeSetAnim = useCallback((anim: AnimationMeta) => {
    clearTimeoutIfSet();
    clearStartRafIfSet();
    // Mount hidden first to avoid flashing frame 0 before playback begins.
    setShouldPlay(false);
    setActiveAnim(anim);
    setAnimKey((k) => k + 1);

    // Start playback on the next frame.
    startRafRef.current = requestAnimationFrame(() => {
      setShouldPlay(true);
      startRafRef.current = null;
    });
  }, []);

  const updateAnimation = useCallback(() => {
    const nextIndex = getNextIndex();
    const anim = inactivityAnimations[nextIndex];
    const filename = isNarrow() ? anim.narrow : anim.wide;
    const resolvedSrc = buildFullPath(filename);

    void preloadSpriteSheet(resolvedSrc);

    safeSetAnim({
      ...anim,
      wide: resolvedSrc,
      narrow: resolvedSrc,
    });
  }, [getNextIndex, inactivityAnimations, isNarrow, safeSetAnim]);

  const playImperativeAnimation = useCallback(
    (index = 0) => {
      if (imperativeAnimations.length === 0) return;

      const anim = imperativeAnimations[index % imperativeAnimations.length];
      const filename = isNarrow() ? anim.narrow : anim.wide;

      safeSetAnim({
        ...anim,
        wide: buildFullPath(filename),
        narrow: buildFullPath(filename),
      });

      timeoutRef.current = setTimeout(() => {
        setActiveAnim(null);
      }, delay);
    },
    [imperativeAnimations, isNarrow, safeSetAnim],
  );

  useImperativeHandle(ref, () => ({ playImperativeAnimation }), [
    playImperativeAnimation,
  ]);

  useEffect(() => {
    let isCancelled = false;
    let preloadTimeout: ReturnType<typeof setTimeout> | null = null;

    const warmNext = (index: number) => {
      if (isCancelled || index >= inactivityAnimationSources.length) return;

      void preloadSpriteSheet(inactivityAnimationSources[index]);
      preloadTimeout = setTimeout(() => {
        warmNext(index + 1);
      }, PRELOAD_STAGGER_MS);
    };

    warmNext(0);

    timeoutRef.current = setTimeout(updateAnimation, initialDelay);
    return () => {
      isCancelled = true;
      if (preloadTimeout !== null) {
        clearTimeout(preloadTimeout);
      }
      clearTimeoutIfSet();
      clearStartRafIfSet();
    };
  }, [inactivityAnimationSources, initialDelay, updateAnimation]);

  const handleEnd = useCallback(() => {
    clearTimeoutIfSet();
    timeoutRef.current = setTimeout(updateAnimation, delay);
  }, [delay, updateAnimation]);

  const currentSrc = useMemo(() => {
    if (!activeAnim) return null;
    return isNarrow() ? activeAnim.narrow : activeAnim.wide;
  }, [activeAnim, isNarrow]);

  return (
    <div className={clsx(styles.animationSequencer, className)}>
      {activeAnim && currentSrc && (
        <SpriteSheetPlayer
          key={animKey}
          src={currentSrc}
          fps={activeAnim.fps}
          loops={activeAnim.loops}
          onEnd={handleEnd}
          endFrame={-1}
          frameControl={shouldPlay ? null : -1}
          renderStrategyQueryParam={SEQUENCER_RENDER_STRATEGY_QUERY_PARAM}
          maxDevicePixelRatioQueryParam={SEQUENCER_MAX_DPR_QUERY_PARAM}
        />
      )}
    </div>
  );
});

AnimationSequencer.displayName = "AnimationSequencer";

export default memo(AnimationSequencer);
