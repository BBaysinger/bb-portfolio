import React, {
  useEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
  useMemo,
} from "react";

import SpriteSheetPlayer from "components/common/SpriteSheetPlayer";
import styles from "./AnimationSequencer.module.scss";

export interface AnimationSequencerHandle {
  playImperativeAnimation: (index?: number) => void;
}

interface AnimationMeta {
  wide: string;
  narrow: string;
  fps?: number;
  loops?: number;
}

const AnimationSequencer = forwardRef<
  AnimationSequencerHandle,
  { className?: string }
>(({ className }, ref) => {
  const [activeAnim, setActiveAnim] = useState<AnimationMeta | null>(null);
  const [animKey, setAnimKey] = useState(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const queueRef = useRef<number[]>([]);

  const delay = 16000;
  const initialDelay = 8000;
  const ratio = 40 / 33;
  const directory = "/spritesheets/fluxel-animations/";
  const extension = ".webp";

  const inactivityAnimations: AnimationMeta[] = [
    {
      wide: "burst1_Layer-Comp-_w16h12f30",
      narrow: "burst1_Layer-Comp-_w16h12f30",
      fps: 10,
      loops: 1,
    },
    {
      wide: "interactive-web_w16h12f105",
      narrow: "interactive-web_w16h12f105",
      fps: 10,
      loops: 1,
    },
    {
      wide: "javascript-typescript_w16h12f142",
      narrow: "javascript-typescript_w16h12f142",
      fps: 10,
      loops: 1,
    },
    {
      wide: "mobile-first_w16h12f82",
      narrow: "mobile-first_w16h12f82",
      fps: 10,
      loops: 1,
    },
    {
      wide: "responsive-design_w16h12f121",
      narrow: "responsive-design_w16h12f121",
      fps: 10,
      loops: 1,
    },
    {
      wide: "single-page-application_w16h12f147",
      narrow: "single-page-application_w16h12f147",
      fps: 10,
      loops: 1,
    },
    {
      wide: "spiral-green-purp_w16h12f215",
      narrow: "spiral-green-purp_w16h12f215",
      fps: 30,
      loops: 1,
    },
    {
      wide: "user-experience_w16h12f109",
      narrow: "user-experience_w16h12f109",
      fps: 10,
      loops: 1,
    },
    {
      wide: "user-interface_w16h12f99",
      narrow: "user-interface_w16h12f99",
      fps: 10,
      loops: 1,
    },
    {
      wide: "runtime-optimization_w16h12f130",
      narrow: "runtime-optimization_w16h12f130",
      fps: 10,
      loops: 1,
    },
    {
      wide: "invaders_w16h12f105",
      narrow: "invaders_w16h12f105",
      fps: 10,
      loops: 1,
    },
  ];

  const imperativeAnimations: AnimationMeta[] = [
    { wide: "", narrow: "", fps: 10, loops: 1 },
  ];

  const shuffleArray = (array: number[]) =>
    array.sort(() => Math.random() - 0.5);

  const getNextIndex = () => {
    if (queueRef.current.length === 0) {
      queueRef.current = shuffleArray([
        ...Array(inactivityAnimations.length).keys(),
      ]);
    }
    return queueRef.current.shift()!;
  };

  const safeSetAnim = (anim: AnimationMeta) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setActiveAnim(anim);
    setAnimKey((k) => k + 1);
  };

  const updateAnimation = () => {
    const aspect = window.innerWidth / window.innerHeight;
    const nextIndex = getNextIndex();
    const anim = inactivityAnimations[nextIndex];
    const filename = aspect < ratio ? anim.narrow : anim.wide;

    safeSetAnim({
      ...anim,
      wide: directory + filename + extension,
      narrow: directory + filename + extension,
    });
  };

  const playImperativeAnimation = (index = 0) => {
    const aspect = window.innerWidth / window.innerHeight;
    const anim = imperativeAnimations[index % imperativeAnimations.length];
    const filename = aspect < ratio ? anim.narrow : anim.wide;

    safeSetAnim({
      ...anim,
      wide: directory + filename,
      narrow: directory + filename,
    });

    timeoutRef.current = setTimeout(() => {
      setActiveAnim(null);
    }, delay);
  };

  useImperativeHandle(ref, () => ({ playImperativeAnimation }), []);

  useEffect(() => {
    timeoutRef.current = setTimeout(updateAnimation, initialDelay);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleEnd = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(updateAnimation, delay);
  };

  const currentSrc = useMemo(() => {
    if (!activeAnim) return null;
    return window.innerWidth / window.innerHeight < ratio
      ? activeAnim.narrow
      : activeAnim.wide;
  }, [activeAnim]);

  return (
    <div className={`${styles.animationSequencer} ${className}`}>
      {activeAnim && currentSrc && (
        <SpriteSheetPlayer
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
