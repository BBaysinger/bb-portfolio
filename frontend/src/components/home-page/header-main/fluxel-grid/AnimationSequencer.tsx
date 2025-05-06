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
 * Giant pixel animations using video.
 *
 * @author Bradley Baysinger
 * @since The beginning of time.
 * @version N/A
 */
const AnimationSequencer = forwardRef<
  AnimationSequencerHandle,
  { className: string }
>(({ className }, ref) => {
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [isFading, setIsFading] = useState(false);
  const [key, setKey] = useState(0); // used to reset video element
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const queueRef = useRef<number[]>([]);
  const delay = 16000;
  const initialDelay = 10000;
  const ratio = 40 / 33;
  const directory = "/video/fluxel-animations/";

  const inactivityAnimations = [
    {
      wide: "interactive-web.webm",
      narrow: "interactive-web.webm",
      delay: 21000,
    },
    {
      wide: "javascript-typescript.webm",
      narrow: "javascript-typescript.webm",
      delay: 21000,
    },
    {
      wide: "responsive-design.webm",
      narrow: "responsive-design.webm",
      delay: 21000,
    },
    {
      wide: "single-page-applications.webm",
      narrow: "single-page-applications.webm",
      delay: 21000,
    },
  ];

  const imperativeAnimations = [
    {
      wide: "/burst1.webm",
      narrow: "/burst1.webm",
      delay: 7000,
    },
    {
      wide: "/invaders-wide.webm",
      narrow: "/invaders-narrow.webm",
      delay: 17000,
    },
    {
      wide: "/spiral.webm",
      narrow: "/spiral.webm",
      delay: 9000,
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

  const updateVideo = () => {
    const aspect = window.innerWidth / window.innerHeight;
    const nextIndex = getNextIndex();
    const anim = inactivityAnimations[nextIndex];
    const filename = aspect < ratio ? anim.narrow : anim.wide;
    console.log("Playing inactivity animation:", filename);
    setVideoSrc(directory + filename);
    setKey((prev) => prev + 1); // Force video to re-render

    timeoutRef.current = setTimeout(() => {
      setVideoSrc(null);
    }, anim.delay + delay);
  };

  const fadeOut = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    setIsFading(true);
    setTimeout(() => {
      setVideoSrc(null);
      setIsFading(false);
    }, 1000); // CSS fade-out duration
  };

  const playImperativeAnimation = (index = 0) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    const aspect = window.innerWidth / window.innerHeight;
    const anim = imperativeAnimations[index % imperativeAnimations.length];
    const filename = aspect < ratio ? anim.narrow : anim.wide;
    console.log("Playing imperative animation:", filename);
    setVideoSrc(directory + filename);
    setKey((prev) => prev + 1);

    timeoutRef.current = setTimeout(() => {
      fadeOut();
    }, anim.delay);
  };

  useImperativeHandle(ref, () => ({
    fadeOut,
    playImperativeAnimation,
  }));

  useEffect(() => {
    timeoutRef.current = setTimeout(updateVideo, initialDelay);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <div
      className={`${styles.animation} ${className} ${isFading ? styles.fadeOut : ""}`}
    >
      {videoSrc && (
        <video
          key={key}
          src={videoSrc}
          autoPlay
          muted
          playsInline
          onEnded={() => setVideoSrc(null)}
        />
      )}
    </div>
  );
});

export default AnimationSequencer;
