import { useState, useEffect } from "react";

import styles from "./ParagraphAnimator.module.scss";

interface ParagraphAnimatorProps {
  paragraphs: string[];
  interval?: number; // Time in milliseconds per character movement
  paragraphDelay?: number; // Delay before switching to the next paragraph
  className?: string;
}

const ParagraphAnimator: React.FC<ParagraphAnimatorProps> = ({
  paragraphs,
  interval = 25,
  paragraphDelay = 7000,
  className,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [spanPosition, setSpanPosition] = useState(0);
  const currentParagraph = paragraphs[currentIndex];

  useEffect(() => {
    if (!currentParagraph) return;

    if (spanPosition < currentParagraph.length) {
      const timer = setTimeout(() => {
        setSpanPosition((prev) => prev + 1);
      }, interval);
      return () => clearTimeout(timer);
    } else {
      // Delay before switching to the next paragraph
      const nextTimer = setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % paragraphs.length);
        setSpanPosition(0); // Reset span position for next paragraph
      }, paragraphDelay);
      return () => clearTimeout(nextTimer);
    }
  }, [
    spanPosition,
    currentParagraph,
    interval,
    paragraphDelay,
    paragraphs.length,
  ]);

  // Insert `</span>` at the spanPosition in the paragraph
  const animatedText = `${currentParagraph.slice(0, spanPosition)}</span>${currentParagraph.slice(spanPosition)}`;

  return (
    <div className={`${styles["paragraph-animator"]} ${className}`}>
      <p dangerouslySetInnerHTML={{ __html: `<span>${animatedText}` }} />
    </div>
  );
};

export default ParagraphAnimator;
