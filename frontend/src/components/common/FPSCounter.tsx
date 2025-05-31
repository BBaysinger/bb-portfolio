import React, { useEffect, useRef, useState } from "react";

import styles from "./FPSCounter.module.scss";

/**
 *
 * Displays the current FPS using requestAnimationFrame.
 *
 * @author Bradley Baysinger
 * @since The beginning of time.
 * @version N/A
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

  return (
    <div className={[styles.fpsCounter, className].join(" ")}>FPS: {fps}</div>
  );
};

export default FPSCounter;
