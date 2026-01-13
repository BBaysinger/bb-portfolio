/**
 * FPSCounter
 *
 * Displays the current frames-per-second (FPS) using `requestAnimationFrame`.
 * Renders two identical layers of text; the second layer is styled via
 * `FPSCounter.module.scss` (`:nth-child(2)`) to create a glow/clip effect.
 */

import clsx from "clsx";
import React, { useEffect, useRef, useState } from "react";

import styles from "./FPSCounter.module.scss";

/**
 * Props for `FPSCounter`.
 *
 * @property updateInterval - Milliseconds between FPS recalculations.
 * @property className - Optional class name applied to the root element.
 */
type FPSCounterProps = { updateInterval?: number; className?: string };

/**
 * Displays the current FPS using requestAnimationFrame.
 * Digits are rendered in separate spans to stabilize layout even when using a
 * non-monospaced 7-tile font.
 */
const FPSCounter: React.FC<FPSCounterProps> = ({
  updateInterval = 500,
  className = "",
}) => {
  const [fps, setFps] = useState(0);

  // Mutable values tracked outside React state to avoid forcing re-renders every frame.
  const frameCount = useRef(0);
  const lastTime = useRef(0);

  useEffect(() => {
    let animationFrameId: number;
    lastTime.current = performance.now();

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

    // Ensure we always cancel the RAF loop when unmounting or changing interval.
    return () => cancelAnimationFrame(animationFrameId);
  }, [updateInterval]);

  // Pad to a minimum of two digits to keep the layout stable (e.g., 09 vs 60).
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
      </div>
      {/*
        Second layer is purely visual (glow/clip styling via :nth-child(2)).
        Marked aria-hidden so screen readers don't announce the FPS twice.
      */}
      <div aria-hidden="true">
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
