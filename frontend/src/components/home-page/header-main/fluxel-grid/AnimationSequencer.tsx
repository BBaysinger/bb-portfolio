import React, {
  useEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
  useMemo,
  useCallback,
} from "react";

import SpriteSheetPlayer from "components/common/sprite-rendering/SpriteSheetPlayer";
import styles from "./AnimationSequencer.module.scss";

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
  weight: number; // required for simplicity
}

/**
 * AnimationSequencer Component
 *
 * This component plays weighted, randomized sprite sheet animations after a delay
 * of user inactivity (i.e., no imperative triggers). Animations are rendered using
 * the `SpriteSheetPlayer` component, which supports frame control and playback options.
 *
 * The sequencer:
 * - Loads `.webp` sprite sheets based on viewport ratio (wide vs. narrow).
 * - Randomly selects from a list of predefined animations with optional weighting.
 * - Waits a defined delay between animations to reduce visual clutter.
 * - Supports triggering specific animations imperatively via ref (e.g., on user interaction).
 * - Uses absolute file paths for sprite sheet lookup.
 * - Plays each animation once unless loop count is specified.
 *
 * Usage:
 * - Pass a `ref` to the component to gain access to the `playImperativeAnimation()` method.
 * - This method can be used to override the inactivity timer and play a specific animation.
 *
 * Note:
 * - This component assumes a sprite naming convention based on resolution (e.g., "wide" or "narrow").
 * - Animations are selected using a weighted random system, avoiding immediate repeats.
 *
 * Dependencies:
 * - React
 * - SpriteSheetPlayer (for sprite-based animation rendering)
 * - SCSS module styles (AnimationSequencer.module.scss)
 *
 * @author Bradley Baysinger
 * @since The beginning of time.
 * @version N/A
 */
const AnimationSequencer = forwardRef<
  AnimationSequencerHandle,
  AnimationSequencerProps
>(({ className }, ref) => {
  const [activeAnim, setActiveAnim] = useState<AnimationMeta | null>(null);
  const [animKey, setAnimKey] = useState(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastPlayedIndexRef = useRef<number | null>(null);

  const delay = 12000;
  const initialDelay = 3000;
  const ratio = 40 / 33;
  const directory = "/spritesheets/fluxel-animations/";
  const extension = ".webp";

  const isNarrow = () => window.innerWidth / window.innerHeight < ratio;
  const buildFullPath = (name: string) => `${directory}${name}${extension}`;
  const clearTimeoutIfSet = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const inactivityAnimations: AnimationMeta[] = [
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
      wide: "runtime-optimization_w16h12f130",
      narrow: "runtime-optimization_w16h12f130",
      fps: 10,
      loops: 1,
      weight: 1,
    },
  ];

  const imperativeAnimations: AnimationMeta[] = [
    { wide: "", narrow: "", fps: 10, loops: 1, weight: 1 },
  ];

  function weightedRandomIndex(
    items: AnimationMeta[],
    lastIndex: number | null,
  ): number {
    const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
    let attemptCount = 0;

    while (attemptCount < 10) {
      let r = Math.random() * totalWeight;
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

    // Fallback: return first different index
    const fallback = items.findIndex((_, i) => i !== lastIndex);
    return fallback >= 0 ? fallback : 0;
  }

  const getNextIndex = () => {
    const index = weightedRandomIndex(
      inactivityAnimations,
      lastPlayedIndexRef.current,
    );
    lastPlayedIndexRef.current = index;
    return index;
  };

  const safeSetAnim = (anim: AnimationMeta) => {
    clearTimeoutIfSet();
    setActiveAnim(anim);
    setAnimKey((k) => k + 1);
  };

  const updateAnimation = () => {
    const nextIndex = getNextIndex();
    const anim = inactivityAnimations[nextIndex];
    const filename = isNarrow() ? anim.narrow : anim.wide;

    safeSetAnim({
      ...anim,
      wide: buildFullPath(filename),
      narrow: buildFullPath(filename),
    });
  };

  const playImperativeAnimation = useCallback((index = 0) => {
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
  }, []);

  useImperativeHandle(ref, () => ({ playImperativeAnimation }), [
    playImperativeAnimation,
  ]);

  useEffect(() => {
    timeoutRef.current = setTimeout(updateAnimation, initialDelay);
    return clearTimeoutIfSet;
  }, []);

  const handleEnd = () => {
    clearTimeoutIfSet();
    timeoutRef.current = setTimeout(updateAnimation, delay);
  };

  const currentSrc = useMemo(() => {
    if (!activeAnim) return null;
    return isNarrow() ? activeAnim.narrow : activeAnim.wide;
  }, [activeAnim]);

  return (
    <div className={`${styles.animationSequencer} ${className}`}>
      {activeAnim && currentSrc && (
        <SpriteSheetPlayer
          // renderStrategy="css"
          key={animKey}
          src={currentSrc}
          fps={activeAnim.fps}
          loops={activeAnim.loops}
          onEnd={handleEnd}
        />
      )}
    </div>
  );
});

export default React.memo(AnimationSequencer);
