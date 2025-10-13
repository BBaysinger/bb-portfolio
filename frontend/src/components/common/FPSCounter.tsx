import clsx from "clsx";
import React, { useEffect, useRef, useState } from "react";

import styles from "./FPSCounter.module.scss";

/**
 * Displays the current FPS using requestAnimationFrame.
 * Digits are rendered in separate divs to stabilize layout
 * when using a non-monospaced 7-tile font.
 *
 */
const FPSCounter: React.FC<{ updateInterval?: number; className?: string }> = ({
  updateInterval = 500,
  className = "",
}) => {
  const [fps, setFps] = useState(0);
  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());

  useEffect(() => {
    let animationFrameId: number;

    const update = () => {
      frameCount.current++;
      const now = performance.now();
      const delta = now - lastTime.current;

      if (delta >= updateInterval) {
        const newFps = (frameCount.current * 1000) / delta;
        setFps(Math.round(newFps));
        frameCount.current = 0;
        lastTime.current = now;
      }

      animationFrameId = requestAnimationFrame(update);
    };

    animationFrameId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animationFrameId);
  }, [updateInterval]);

  const fpsDigits = fps.toString().padStart(2, "0").split("");

  return (
    <div className={clsx(styles.fpsCounter, className)}>
      <div>
        <span className={styles.label}>FPS:</span>
        {fpsDigits.map((digit, index) => (
          <span key={index} className={styles.digit}>
            {digit}
          </span>
        ))}
        <span className={styles.note}>&nbsp;&larr; render performance</span>
      </div>
      <div>
        <span className={styles.label}>FPS:</span>
        {fpsDigits.map((digit, index) => (
          <span key={index} className={styles.digit}>
            {digit}
          </span>
        ))}
      </div>
    </div>
  );
};

export default FPSCounter;
