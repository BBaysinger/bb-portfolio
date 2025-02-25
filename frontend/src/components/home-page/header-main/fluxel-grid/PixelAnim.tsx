import React, { useEffect, useRef, useState } from "react";

import styles from "./PixelAnim.module.scss";

/**
 * Fluxing Pixel Grid
 *
 * Makes a grid of giant pixels that can be interacted with.
 * Here I've added simulated shadows for depth with mouse move effect and
 * I mapped animated images to the grid for a unique experience.
 * Built in React since that's my current focus, but I need to rebuild it in
 * PixiJS with WebGL, for performance with other onscreen animations.
 *
 * @author Bradley Baysinger
 * @since The beginning of time.
 * @version N/A
 */
const PixelAnimations: React.FC<{
  className: string;
}> = ({ className }) => {
  const [animation, setAnimation] = useState<string>();

  const timeoutRef = useRef<NodeJS.Timeout | null>(null); // Store timeout ID
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sequence = [
      { class: styles["fluxel-interactive"], delay: 28000 },
      { class: styles["fluxel-burst1"], delay: 8000 },
      { class: styles["fluxel-invaders"], delay: 20000 },
    ];

    let index = 0;

    const loopAnimation = () => {
      setAnimation(sequence[index].class);
      const nextIndex = (index + 1) % sequence.length;

      console.log(
        "nextIndex",
        nextIndex,
        sequence[index].class,
        sequence[index].delay,
      );

      timeoutRef.current = setTimeout(() => {
        index = nextIndex;
        loopAnimation();
      }, sequence[index].delay);
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
