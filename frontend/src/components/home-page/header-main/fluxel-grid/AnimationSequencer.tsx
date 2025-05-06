import {
  useEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";

import styles from "./AnimationSequencer.module.scss";

export interface AnimationSequencerHandle {
  fadeOut: () => void;
  playImperativeAnimation: (index?: number) => void;
}

/**
 * Giant pixel animations using GIFs.
 *
 * Using GIFs bc I'm having better luck than with WEBP.
 * FFMPEG is corrupting colors horribly.
 *
 * This may eventually be rebuilt in PixiJS, along with
 * the fluxel grid, and some of the effects will be interactive.
 *
 * Uses JavaScript to handle background images dynamically,
 * including media query logic for orientation changes.
 * the fluxel grid, and some effects will be interactive.
 *
 * @author Bradley Baysinger
 * @since The beginning of time.
 * @version N/A
 */
const AnimationSequencer = forwardRef<
  AnimationSequencerHandle,
  { className: string }
>(({ className }, ref) => {
  const [backgroundImage, setBackgroundImage] = useState<string>("");
  const [isFading, setIsFading] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const queueRef = useRef<number[]>([]);
  const delay = 16000;
  const initialDelay = 10000;
  const ratio = 40 / 33;

  // Separate pools
  const inactivityAnimations = [
    {
      wide: "/images/fluxel-animations/interactive-web.gif",
      narrow: "/images/fluxel-animations/interactive-web.gif",
      delay: 21000,
    },
    {
      wide: "/images/fluxel-animations/javascript-typescript.gif",
      narrow: "/images/fluxel-animations/javascript-typescript.gif",
      delay: 21000,
    },
    {
      wide: "/images/fluxel-animations/responsive-design.gif",
      narrow: "/images/fluxel-animations/responsive-design.gif",
      delay: 21000,
    },
    {
      wide: "/images/fluxel-animations/single-page-applications.gif",
      narrow: "/images/fluxel-animations/single-page-applications.gif",
      delay: 21000,
    },
  ];

  const imperativeAnimations = [
    {
      wide: "/images/fluxel-animations/burst1.gif",
      narrow: "/images/fluxel-animations/burst1.gif",
      delay: 7000,
    },
    {
      wide: "/images/fluxel-animations/invaders-wide.gif",
      narrow: "/images/fluxel-animations/invaders-narrow.gif",
      delay: 17000,
    },
    {
      wide: "/images/fluxel-animations/spiral.gif",
      narrow: "/images/fluxel-animations/spiral.gif",
      delay: 9000,
    },
    // Add more imperative animations here
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

  const updateBackground = () => {
    const aspect = window.innerWidth / window.innerHeight;
    const nextIndex = getNextIndex();

    const imageUrl =
      aspect < ratio
        ? inactivityAnimations[nextIndex].narrow
        : inactivityAnimations[nextIndex].wide;

    setBackgroundImage(imageUrl);

    timeoutRef.current = setTimeout(
      updateBackground,
      inactivityAnimations[nextIndex].delay + delay,
    );
  };

  const fadeOut = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    setIsFading(true);

    setTimeout(() => {
      setBackgroundImage("");
      setIsFading(false);
    }, 1000); // Match this to CSS fade-out timing
  };

  const playImperativeAnimation = (index = 0) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    const aspect = window.innerWidth / window.innerHeight;
    const anim = imperativeAnimations[index % imperativeAnimations.length];

    const imageUrl = aspect < ratio ? anim.narrow : anim.wide;
    setBackgroundImage(imageUrl);

    timeoutRef.current = setTimeout(() => {
      fadeOut();
    }, anim.delay);
  };

  useImperativeHandle(ref, () => ({
    fadeOut,
    playImperativeAnimation,
  }));

  useEffect(() => {
    timeoutRef.current = setTimeout(updateBackground, initialDelay);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <div
      className={`${styles.animation} ${className} ${isFading ? styles.fadeOut : ""}`}
      style={{
        backgroundImage: backgroundImage ? `url(${backgroundImage})` : "none",
      }}
    ></div>
  );
});

export default AnimationSequencer;
