import React, {
  useEffect,
  useRef,
  useState,
  ReactElement,
  HTMLAttributes,
} from "react";

import styles from "./FlipBook.module.scss";
import { gsap } from "gsap";

type Props = {
  text: string;
  maskWidth?: number;
  fontSize?: number;
  fontFamily?: string;
  fps?: number;
  className?: string;
};

const totalBounceSteps = 20;
const maxBounce = 10;

const ease = gsap.parseEase("bounce.out");
const bounceYMap = Array.from({ length: totalBounceSteps }, (_, i) => {
  const t = i / (totalBounceSteps - 1);
  return parseFloat(((1 - ease(t)) * maxBounce).toFixed(2));
});

const FlipBookTooltip: React.FC<Props> = ({
  text,
  maskWidth = 200,
  fontSize = 20,
  fontFamily = "sans-serif",
  fps = 30,
  className = "",
}) => {
  const measureRef = useRef<HTMLDivElement | null>(null);
  const [frameCount, setFrameCount] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);

  // ✅ Type the framesRef correctly
  const framesRef = useRef<ReactElement<HTMLAttributes<HTMLDivElement>>[]>([]);

  const repeatedText = `${text}\u00A0`.repeat(20);

  useEffect(() => {
    if (!measureRef.current) return;
    const totalWidth = measureRef.current.offsetWidth;
    const count = Math.max(1, totalWidth - maskWidth + 1);
    setFrameCount(count);

    const newFrames = Array.from({ length: count }).map((_, i) => (
      <div
        key={i}
        className={styles.frame}
        style={
          {
            "--scroll-offset": `-${i}px`,
            "--bounce-offset": `${bounceYMap[i % bounceYMap.length]}px`,
          } as Record<string, string>
        }
      >
        {repeatedText}
      </div>
    ));

    framesRef.current = newFrames;
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
      style={{ width: maskWidth, fontSize, fontFamily }}
    >
      <div ref={measureRef} className={styles.measure} aria-hidden>
        {repeatedText}
      </div>

      <div className={styles.frameStack}>
        {framesRef.current.map((frame, i) =>
          React.cloneElement(frame, {
            className: `${styles.frame} ${
              i === activeIndex ? styles.active : ""
            }`,
          }),
        )}
      </div>

      <div
        className={styles.arrowImage}
        style={
          {
            "--bounce-offset": `${bounceYMap[activeIndex % bounceYMap.length]}px`,
          } as React.CSSProperties
        }
      />
    </div>
  );
};

export default FlipBookTooltip;
