"use client";

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
  // Show only in dev/local profiles. Use build-time env when available on client.
  const profile = (
    process.env.NEXT_PUBLIC_ENV_PROFILE ||
    process.env.ENV_PROFILE ||
    process.env.NODE_ENV ||
    ""
  ).toLowerCase();
  const isDevLike =
    profile === "dev" || profile === "development" || profile === "local";

  if (!isDevLike) return null;

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
        <div className={styles.label}>FPS:</div>
        <div className={styles.output}>
          {fpsDigits.map((digit, index) => (
            <span key={index} className={styles.digit}>
              {digit}
            </span>
          ))}
        </div>
        {/* <span className={styles.note}>&nbsp;&larr; render performance</span> */}
      </div>
      <div>
        <div className={styles.label}>FPS:</div>
        <div className={styles.output}>
          {fpsDigits.map((digit, index) => (
            <span key={index} className={styles.digit}>
              {digit}
            </span>
          ))}
        </div>
      </div>
      <span className={styles.tab}>
        <span>render performance</span>
      </span>
    </div>
  );
};

export default FPSCounter;
