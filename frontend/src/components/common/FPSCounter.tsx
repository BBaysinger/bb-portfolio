"use client";

import clsx from "clsx";
import React, { useEffect, useRef, useState } from "react";

import styles from "./FPSCounter.module.scss";

const profile = (
  process.env.NEXT_PUBLIC_ENV_PROFILE ||
  process.env.ENV_PROFILE ||
  process.env.NODE_ENV ||
  ""
).toLowerCase();
const isDevLike =
  profile === "dev" || profile === "development" || profile === "local";

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
  const [mounted, setMounted] = useState(false);
  const frameCount = useRef(0);
  const lastTime = useRef<number | null>(null);

  useEffect(() => {
    const mountRaf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(mountRaf);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    let animationFrameId: number;

    const update = () => {
      frameCount.current++;
      const now = performance.now();
      const prev = lastTime.current;
      if (prev == null) {
        lastTime.current = now;
        animationFrameId = requestAnimationFrame(update);
        return;
      }
      const delta = now - prev;

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
  }, [mounted, updateInterval]);

  if (!isDevLike) return null;

  const fpsDigits = fps.toString().padStart(2, "0").split("");

  return (
    <div
      className={clsx(styles.fpsCounter, className)}
      style={{ display: mounted ? "inline-block" : "none" }}
    >
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
