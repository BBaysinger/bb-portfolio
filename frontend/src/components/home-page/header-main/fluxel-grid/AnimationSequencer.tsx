import {
  useEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";

import SpriteSheetPlayer from "components/common/SpriteSheetPlayer";
import styles from "./AnimationSequencer.module.scss";

export interface AnimationSequencerHandle {
  // fadeOut: () => void;
  playImperativeAnimation: (index?: number) => void;
}

interface AnimationMeta {
  wide: string;
  narrow: string;
  frameWidth: number;
  frameHeight: number;
  frameCount: number;
  fps?: number;
}

const AnimationSequencer = forwardRef<
  AnimationSequencerHandle,
  { className: string }
>(({ className }, ref) => {
  const [activeAnim, setActiveAnim] = useState<AnimationMeta | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const queueRef = useRef<number[]>([]);

  const delay = 16000;
  const initialDelay = 3000;
  const ratio = 40 / 33;
  const directory = "/spritesheets/fluxel-animations/";

  const inactivityAnimations: AnimationMeta[] = [
    {
      wide: "interactive-web.webp",
      narrow: "interactive-web.webp",
      frameWidth: 16,
      frameHeight: 12,
      frameCount: 104,
      fps: 10,
    },
    {
      wide: "javascript-typescript.webp",
      narrow: "javascript-typescript.webp",
      frameWidth: 16,
      frameHeight: 12,
      frameCount: 142,
      fps: 10,
    },
    {
      wide: "responsive-design.webp",
      narrow: "responsive-design.webp",
      frameWidth: 16,
      frameHeight: 12,
      frameCount: 121,
      fps: 20,
    },
    {
      wide: "single-page-applications.webp",
      narrow: "single-page-applications.webp",
      frameWidth: 16,
      frameHeight: 12,
      frameCount: 154,
      fps: 10,
    },
    {
      wide: "mobile-first.webp",
      narrow: "mobile-first.webp",
      frameWidth: 16,
      frameHeight: 12,
      frameCount: 82,
      fps: 10,
    },
  ];

  const imperativeAnimations: AnimationMeta[] = [
    {
      wide: "burst1.webp",
      narrow: "burst1.webp",
      frameWidth: 16,
      frameHeight: 12,
      frameCount: 30,
      fps: 10,
    },
    {
      wide: "invaders-wide.webp",
      narrow: "invaders-narrow.webp",
      frameWidth: 16,
      frameHeight: 12,
      frameCount: 60,
      fps: 10,
    },
    {
      wide: "spiral.webp",
      narrow: "spiral.webp",
      frameWidth: 16,
      frameHeight: 12,
      frameCount: 50,
      fps: 10,
    },
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

  const updateAnimation = () => {
    const aspect = window.innerWidth / window.innerHeight;
    const nextIndex = getNextIndex();
    const anim = inactivityAnimations[nextIndex];
    const filename = aspect < ratio ? anim.narrow : anim.wide;

    setActiveAnim({
      ...anim,
      wide: directory + filename,
      narrow: directory + filename,
    });
  };

  // const fadeOut = () => {
  //   if (timeoutRef.current) clearTimeout(timeoutRef.current);
  //   setTimeout(() => {
  //     setActiveAnim(null);
  //   }, 1000);
  // };

  const playImperativeAnimation = (index = 0) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    const aspect = window.innerWidth / window.innerHeight;
    const anim = imperativeAnimations[index % imperativeAnimations.length];
    const filename = aspect < ratio ? anim.narrow : anim.wide;

    setActiveAnim({
      ...anim,
      wide: directory + filename,
      narrow: directory + filename,
    });

    timeoutRef.current = setTimeout(() => {
      setActiveAnim(null);
    }, delay);
  };

  useImperativeHandle(ref, () => ({
    playImperativeAnimation,
  }));

  useEffect(() => {
    timeoutRef.current = setTimeout(updateAnimation, initialDelay);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleEnd = () => {
    timeoutRef.current = setTimeout(() => {
      updateAnimation();
    }, delay);
  };

  const currentSrc =
    activeAnim &&
    (window.innerWidth / window.innerHeight < ratio
      ? activeAnim.narrow
      : activeAnim.wide);

  return (
    <div className={`${styles.animationSequencer} ${className}`}>
      {activeAnim && currentSrc && (
        <SpriteSheetPlayer
          className={styles.spriteSheetPlayer}
          src={currentSrc}
          frameWidth={activeAnim.frameWidth}
          frameHeight={activeAnim.frameHeight}
          frameCount={activeAnim.frameCount}
          fps={activeAnim.fps}
          loop={false}
          onEnd={handleEnd}
        />
      )}
    </div>
  );
});

export default AnimationSequencer;
