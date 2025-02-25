import React, { useEffect, useRef, useState } from "react";

import styles from "./PixelAnim.module.scss";

/**
 * Giant pixel animations.
 *
 * Using GIFs bc I'm having better luck than with WEBP.
 * FFMPEG is corrupting my colors.
 *
 * @author Bradley Baysinger
 * @since The beginning of time.
 * @version N/A
 */
const PixelAnimations: React.FC<{
  className: string;
}> = ({ className }) => {
  const [animation, setAnimation] = useState<string>();

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const lastIndexRef = useRef<number | null>(null); // Store the last index

  useEffect(() => {
    const sequence = [
      { class: styles["fluxel-interactive"], delay: 28000 },
      { class: styles["fluxel-burst1"], delay: 8000 },
      { class: styles["fluxel-invaders"], delay: 20000 },
      { class: styles["spiral"], delay: 20000 },
    ];

    const getRandomIndex = (excludeIndex: number | null) => {
      let newIndex: number;
      do {
        newIndex = Math.floor(Math.random() * sequence.length);
      } while (newIndex === excludeIndex); // Ensure it's different from the last one
      return newIndex;
    };

    const loopAnimation = () => {
      const nextIndex = getRandomIndex(lastIndexRef.current);
      lastIndexRef.current = nextIndex;

      setAnimation(sequence[nextIndex].class);

      console.log(
        "Next animation:",
        sequence[nextIndex].class,
        "Delay:",
        sequence[nextIndex].delay,
      );

      timeoutRef.current = setTimeout(loopAnimation, sequence[nextIndex].delay);
    };

    setTimeout(loopAnimation, 3000);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return <div ref={gridRef} className={`${className} ${animation}`}></div>;
};

export default PixelAnimations;
