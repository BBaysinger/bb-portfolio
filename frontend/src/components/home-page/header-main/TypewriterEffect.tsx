import clsx from "clsx";
import gsap from "gsap";
import { useEffect, useRef, useState } from "react";

import styles from "./TypewriterEffect.module.scss";

interface TypewriterEffectProps {
  paragraphs: string[];
  interval?: number;
  paragraphDelay?: number;
  initialDelay?: number;
  className?: string;
  onParagraphComplete?: (paragraph: string, index: number) => boolean | void;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

const shuffleArray = (array: number[]) => {
  return array.sort(() => Math.random() - 0.5);
};

/**
 * TypewriterEffect
 *
 * Typewriter-style paragraph rotator.
 * Displays one paragraph at a time, “typing” each character, then waits
 * before advancing to the next paragraph (shuffled). Content sequencing is
 * owned by the caller; this component only animates the provided list.
 */
const TypewriterEffect: React.FC<TypewriterEffectProps> = ({
  paragraphs,
  interval = 15,
  paragraphDelay = 20000,
  initialDelay = 1000,
  className,
  onParagraphComplete,
  children,
}) => {
  const [visibleText, setVisibleText] = useState("");
  const [invisibleText, setInvisibleText] = useState("");
  const [isAnimating, setIsAnimating] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const tl = useRef<gsap.core.Timeline | null>(null);
  const currentIndex = useRef(0);
  const queue = useRef<number[]>([]);
  const delayTimer = useRef<number | null>(null);
  const onParagraphCompleteRef = useRef(onParagraphComplete);

  useEffect(() => {
    onParagraphCompleteRef.current = onParagraphComplete;
  }, [onParagraphComplete]);

  useEffect(() => {
    const clearAdvanceDelay = () => {
      if (delayTimer.current) {
        clearTimeout(delayTimer.current);
        delayTimer.current = null;
      }
    };

    const generateShuffledQueue = () =>
      shuffleArray(paragraphs.map((_, i) => i));

    const playParagraph = () => {
      const index = queue.current[currentIndex.current];
      const paragraph = paragraphs[index];

      if (!paragraph) return;

      clearAdvanceDelay();
      setVisibleText("");
      setInvisibleText(paragraph);
      setIsAnimating(true);

      tl.current?.kill();
      tl.current = gsap.timeline();
      tl.current.to({}, { duration: initialDelay / 1000 });
      tl.current.to(
        { value: 0 },
        {
          value: paragraph.length,
          duration: (paragraph.length * interval) / 1000,
          ease: "none",
          onUpdate() {
            const pos = Math.floor(this.targets()[0].value);
            setVisibleText(paragraph.slice(0, pos));
            setInvisibleText(paragraph.slice(pos));
          },
          onComplete: () => {
            setIsAnimating(false);
            delayTimer.current = window.setTimeout(() => {
              const shouldContinue = onParagraphCompleteRef.current?.(
                paragraph,
                index,
              );
              if (shouldContinue === false) return;
              if (queue.current.length === 1 && shouldContinue !== true) return;

              currentIndex.current += 1;
              if (currentIndex.current >= queue.current.length) {
                queue.current = generateShuffledQueue();
                currentIndex.current = 0;
              }
              playParagraph();
            }, paragraphDelay);
          },
        },
      );
    };

    queue.current = generateShuffledQueue();
    currentIndex.current = 0;
    playParagraph();

    return () => {
      tl.current?.kill();
      clearAdvanceDelay();
    };
  }, [initialDelay, interval, paragraphDelay, paragraphs]);

  return (
    <div
      ref={containerRef}
      className={clsx(styles.typewriterEffect, className)}
    >
      <p className={styles.paragraphLine}>
        <span className={styles.visible}>{visibleText}</span>
        <span
          className={clsx(styles.cursor, isAnimating && styles.cursorSolid)}
        />{" "}
        <span className={styles.invisible}>{invisibleText}</span>
      </p>
      <div>{children}</div>
    </div>
  );
};

export default TypewriterEffect;
