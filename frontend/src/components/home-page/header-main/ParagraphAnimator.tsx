import { useState, useEffect } from "react";

import styles from "./ParagraphAnimator.module.scss";

interface ParagraphAnimatorProps {
  paragraphs: string[];
  interval?: number;
  paragraphDelay?: number;
  initialDelay?: number;
  className?: string;
}

const shuffleArray = (array: number[]) => {
  return array.sort(() => Math.random() - 0.5);
};

const ParagraphAnimator: React.FC<ParagraphAnimatorProps> = ({
  paragraphs,
  interval = 25,
  paragraphDelay = 20000,
  initialDelay = 8000,
  className,
}) => {
  const [spanPosition, setSpanPosition] = useState(0);
  const [fade, setFade] = useState("fade-out");
  const [isInitialDelayOver, setIsInitialDelayOver] = useState(false);
  const [indexQueue, setIndexQueue] = useState<number[]>(
    shuffleArray([...Array(paragraphs.length).keys()]),
  );
  const [currentIndex, setCurrentIndex] = useState(indexQueue[0]);

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
        setSpanPosition(0);
        setFade("fade-in");

        setIndexQueue((prevQueue) => {
          let newQueue = [...prevQueue.slice(1)];
          if (newQueue.length === 0) {
            newQueue = shuffleArray([...Array(paragraphs.length).keys()]);
          }
          setCurrentIndex(newQueue[0]);
          return newQueue;
        });
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
