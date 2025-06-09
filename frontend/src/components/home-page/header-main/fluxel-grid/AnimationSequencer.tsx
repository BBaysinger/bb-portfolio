import React, {
  useEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
  useMemo,
  useCallback,
} from "react";

import SpriteSheetPlayer from "components/common/SpriteSheetPlayer";
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
 *
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

  const delay = 16000;
  const initialDelay = 8000;
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
    {
      wide: "invaders_w16h12f105",
      narrow: "invaders_w16h12f105",
      fps: 10,
      loops: 1,
      weight: 2,
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
          renderStrategy="css"
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
