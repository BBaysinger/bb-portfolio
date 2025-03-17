import React, { useEffect, useRef, useState } from "react";

import styles from "./AnimationSequencer.module.scss";

/**
 * Giant pixel animations using GIFs.
 *
 * Using GIFs bc I'm having better luck than with WEBP.
 * FFMPEG is corrupting colors horribly.
 *
 * This will eventually be rebuilt in PixiJS, along with
 * the fluxel grid, and some of the effects will be interactive.
 *
 * Uses JavaScript to handle background images dynamically,
 * including media query logic for orientation changes.
 *
 * @author Bradley Baysinger
 * @since The beginning of time.
 * @version N/A
 */
const AnimationSequencer: React.FC<{ className: string }> = ({ className }) => {
  const [backgroundImage, setBackgroundImage] = useState<string>("");
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const queueRef = useRef<number[]>([]);
  const delay = 12000;
  const initialDelay = 5000;

  const sequence = [
    {
      wide: "/images/fluxel-animations/interactive.gif",
      narrow: "/images/fluxel-animations/interactive.gif",
      delay: 21000,
    },
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
  ];

  const shuffleArray = (array: number[]) =>
    array.sort(() => Math.random() - 0.5);

  const getNextIndex = () => {
    if (queueRef.current.length === 0) {
      queueRef.current = shuffleArray([...Array(sequence.length).keys()]);
    }
    return queueRef.current.shift()!;
  };

  const updateBackground = () => {
    const aspect = window.innerWidth / window.innerHeight;
    const nextIndex = getNextIndex();

    const imageUrl =
      aspect > 4 / 3 ? sequence[nextIndex].narrow : sequence[nextIndex].wide;

    // const orientation = aspect < 4 / 3 ? "narrow" : "wide";
    // console.log(aspect, 4 / 3, orientation);

    setBackgroundImage(imageUrl);

    timeoutRef.current = setTimeout(
      updateBackground,
      sequence[nextIndex].delay + delay,
    );
  };

  useEffect(() => {
    timeoutRef.current = setTimeout(updateBackground, initialDelay);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <div
      className={`${styles.animation} ${className}`}
      style={{
        backgroundImage: `url(${backgroundImage})`,
      }}
    ></div>
  );
};

export default AnimationSequencer;
