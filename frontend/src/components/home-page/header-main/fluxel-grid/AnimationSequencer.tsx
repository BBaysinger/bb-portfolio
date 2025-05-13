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

  const inactivityAnimations: AnimationMeta[] = [
    {
      wide: "burst1_Layer-Comp-_w16h12f30r10l1.webp",
      narrow: "burst1_Layer-Comp-_w16h12f30r10l1.webp",
      fps: 10,
    },
    {
      wide: "interactive-web_w16h12f105r10l1.webp",
      narrow: "interactive-web_w16h12f105r10l1.webp",
      fps: 10,
    },
    {
      wide: "javascript-typescript_w16h12f142r10l1.webp",
      narrow: "javascript-typescript_w16h12f142r10l1.webp",
      fps: 10,
    },
    {
      wide: "mobile-first_w16h12f82r10l1.webp",
      narrow: "mobile-first_w16h12f82r10l1.webp",
      fps: 10,
    },
    {
      wide: "responsive-design_w16h12f121r10l1.webp",
      narrow: "responsive-design_w16h12f121r10l1.webp",
      fps: 10,
    },
    {
      wide: "single-page-application_w16h12f147r10l1.webp",
      narrow: "single-page-application_w16h12f147r10l1.webp",
      fps: 10,
    },
    {
      wide: "spiral-green-purp_w16h12f215r10l1.webp",
      narrow: "spiral-green-purp_w16h12f215r10l1.webp",
      fps: 20,
    },
    {
      wide: "user-experience_w16h12f109r10l1.webp",
      narrow: "user-experience_w16h12f109r10l1.webp",
      fps: 10,
    },
    {
      wide: "user-interface_w16h12f99r10l1.webp",
      narrow: "user-interface_w16h12f99r10l1.webp",
      fps: 10,
    },
  ];

  const imperativeAnimations: AnimationMeta[] = [
    { wide: ".webp", narrow: ".webp", fps: 10 },
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
      wide: directory + filename,
      narrow: directory + filename,
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
          onEnd={handleEnd}
        />
      )}
    </div>
  );
});

export default React.memo(AnimationSequencer);
