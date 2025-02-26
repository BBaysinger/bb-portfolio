import { useState, useEffect } from "react";

import styles from "./ParagraphAnimator.module.scss";

interface ParagraphAnimatorProps {
  paragraphs: string[];
  interval?: number;
  paragraphDelay?: number;
  initialDelay?: number;
  className?: string;
}

const ParagraphAnimator: React.FC<ParagraphAnimatorProps> = ({
  paragraphs,
  interval = 25,
  paragraphDelay = 20000,
  initialDelay = 8000, // Default initial delay of 3 seconds
  className,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [spanPosition, setSpanPosition] = useState(0);
  const [fade, setFade] = useState("fade-out");
  const [isInitialDelayOver, setIsInitialDelayOver] = useState(false);
  const currentParagraph = paragraphs[currentIndex];

  useEffect(() => {
    const initialTimer = setTimeout(() => {
      setIsInitialDelayOver(true);
      setFade("fade-in");
    }, initialDelay);

    return () => clearTimeout(initialTimer);
  }, [initialDelay]);

  useEffect(() => {
    if (!isInitialDelayOver || !currentParagraph) return;

    if (spanPosition < currentParagraph.length) {
      const timer = setTimeout(() => {
        setSpanPosition((prev) => prev + 1);
      }, interval);
      return () => clearTimeout(timer);
    } else {
      const fadeOutTimer = setTimeout(() => {
        setFade("fade-out");
      }, paragraphDelay - 10000);

      const nextTimer = setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % paragraphs.length);
        setSpanPosition(0);
        setFade("fade-in");
      }, paragraphDelay);

      return () => {
        clearTimeout(fadeOutTimer);
        clearTimeout(nextTimer);
      };
    }
  }, [
    spanPosition,
    currentParagraph,
    interval,
    paragraphDelay,
    paragraphs.length,
    isInitialDelayOver,
  ]);

  const animatedText = `${currentParagraph.slice(0, spanPosition)}</span>${currentParagraph.slice(spanPosition)}`;

  return (
    <div
      className={`${styles["paragraph-animator"]} ${className} ${styles[fade]}`}
    >
      <p dangerouslySetInnerHTML={{ __html: `<span>${animatedText}` }} />
    </div>
  );
};

export default ParagraphAnimator;
