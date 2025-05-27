import React, { useEffect, useRef, useState } from "react";
import styles from "./FlipBook.module.scss";

type Props = {
  text: string;
  maskWidth?: number;
  fontSize?: number;
  fontFamily?: string;
  fps?: number;
  className?: string;
};

const FlipBook: React.FC<Props> = ({
  text,
  maskWidth = 200,
  fontSize = 20,
  fontFamily = "sans-serif",
  fps = 30,
  className = "",
}) => {
  const measureRef = useRef<HTMLDivElement | null>(null);
  const [frames, setFrames] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const animationRef = useRef<number | null>(null);

  const repeatedText = `${text} \u00A0 ${text}`;

  useEffect(() => {
    if (!measureRef.current) return;

    const width = measureRef.current.offsetWidth;
    const numFrames = Math.max(1, width - maskWidth + 1);

    const newFrames: string[] = [];
    for (let i = 0; i < numFrames; i++) {
      newFrames.push(`translateX(-${i}px)`);
    }

    setFrames(newFrames);
    setActiveIndex(0);
  }, [text, maskWidth, repeatedText]);

  useEffect(() => {
    if (frames.length <= 1) return;

    let lastTime = performance.now();
    const frameDuration = 1000 / fps;

    const tick = (now: number) => {
      const delta = now - lastTime;
      if (delta >= frameDuration) {
        setActiveIndex((prev) => (prev + 1) % frames.length);
        lastTime = now - (delta % frameDuration);
      }
      animationRef.current = requestAnimationFrame(tick);
    };

    animationRef.current = requestAnimationFrame(tick);
    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [frames, fps]);

  return (
    <div
      className={`${styles.wrapper} ${className}`}
      style={{ width: maskWidth, fontSize, fontFamily }}
    >
      {/* Hidden measurer */}
      <div
        ref={measureRef}
        className={styles.measure}
        style={{ fontSize, fontFamily }}
        aria-hidden
      >
        {repeatedText}
      </div>

      {/* Frame stack */}
      <div className={styles.frameStack}>
        {frames.map((transform, i) => {
          const maskStepCount = 10; // total frames in your sway animation
          const maskFrame = i % maskStepCount;
          const delay = -(maskFrame / maskStepCount); // pause at specific point in animation

          return (
            <div
              className={`${styles.frame} ${i === activeIndex ? styles.active : ""}`}
              style={{
                transform,
                fontSize,
                fontFamily,
                width: "max-content",
                animationDelay: `${delay}s`,
              }}
              key={i}
            >
              {repeatedText}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FlipBook;
