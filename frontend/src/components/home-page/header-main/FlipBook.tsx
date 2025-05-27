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
  fps = 30,
  className = "",
}) => {
  const measureRef = useRef<HTMLDivElement | null>(null);
  const [frameCount, setFrameCount] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);

  const repeatedText = `${text}\u00A0${text}`;

  useEffect(() => {
    if (!measureRef.current) return;

    const totalWidth = measureRef.current.offsetWidth;
    const count = Math.max(1, totalWidth - maskWidth + 1);
    setFrameCount(count);
    setActiveIndex(0);
  }, [text, maskWidth, repeatedText]);

  useEffect(() => {
    if (frameCount <= 1) return;

    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % frameCount);
    }, 1000 / fps);

    return () => clearInterval(interval);
  }, [frameCount, fps]);

  return (
    <div
      className={`${styles.wrapper} ${className}`}
      style={{ width: maskWidth }}
    >
      {/* Hidden measurement element */}
      <div ref={measureRef} className={styles.measure} aria-hidden>
        {repeatedText}
      </div>

      {Array.from({ length: frameCount }).map((_, i) => (
        <div
          key={i}
          className={`${styles.frame} ${i === activeIndex ? styles.active : ""}`}
          style={{
            ["--frame-index" as any]: i,
            ["--mask-step" as any]: i % 10, // JS does the modulo
          }}
        >
          {repeatedText}
        </div>
      ))}
    </div>
  );
};

export default FlipBook;
