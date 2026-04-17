import clsx from "clsx";
import gsap from "gsap";
import { useCallback, useEffect, useRef, useState } from "react";

import styles from "./TypewriterEffect.module.scss";

interface TypewriterEffectProps {
  paragraphs: string[];
  interval?: number;
  paragraphDelay?: number;
  initialDelay?: number;
  className?: string;
  paused?: boolean;
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
  paused = false,
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
  const pausedRef = useRef(paused);
  const delayStartedAt = useRef<number | null>(null);
  const delayRemaining = useRef(paragraphDelay);
  const pendingAdvance = useRef<(() => void) | null>(null);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  const clearAdvanceDelay = useCallback(() => {
    if (delayTimer.current) {
      clearTimeout(delayTimer.current);
      delayTimer.current = null;
    }
    delayStartedAt.current = null;
  }, []);

  const scheduleAdvanceDelay = useCallback(() => {
    if (pausedRef.current || !pendingAdvance.current) return;

    clearAdvanceDelay();
    delayStartedAt.current = window.performance.now();
    delayTimer.current = window.setTimeout(() => {
      const next = pendingAdvance.current;

      pendingAdvance.current = null;
      delayRemaining.current = paragraphDelay;
      clearAdvanceDelay();
      next?.();
    }, delayRemaining.current);
  }, [clearAdvanceDelay, paragraphDelay]);

  useEffect(() => {
    pausedRef.current = paused;

    if (!pendingAdvance.current) return;

    if (paused) {
      if (delayTimer.current && delayStartedAt.current !== null) {
        const elapsed = window.performance.now() - delayStartedAt.current;
        delayRemaining.current = Math.max(0, delayRemaining.current - elapsed);
      }
      clearAdvanceDelay();
      return;
    }

    if (!delayTimer.current) {
      scheduleAdvanceDelay();
    }
  }, [clearAdvanceDelay, paused, scheduleAdvanceDelay]);

  const generateShuffledQueue = useCallback(
    () => shuffleArray(paragraphs.map((_, i) => i)),
    [paragraphs],
  );

  const playParagraph = useCallback(
    function playParagraphImpl() {
      const index = queue.current[currentIndex.current];
      const paragraph = paragraphs[index];

      if (!paragraph) return;

      pendingAdvance.current = null;
      delayRemaining.current = paragraphDelay;
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

            pendingAdvance.current = () => {
              const shouldContinue = onParagraphComplete?.(paragraph, index);
              if (shouldContinue === false) return;

              currentIndex.current++;
              if (currentIndex.current >= queue.current.length) {
                queue.current = generateShuffledQueue();
                currentIndex.current = 0;
              }
              playParagraphImpl();
            };
            delayRemaining.current = paragraphDelay;
            scheduleAdvanceDelay();
          },
        },
      );
    },
    [
      clearAdvanceDelay,
      generateShuffledQueue,
      initialDelay,
      interval,
      onParagraphComplete,
      paragraphDelay,
      paragraphs,
      scheduleAdvanceDelay,
    ],
  );

  useEffect(() => {
    queue.current = generateShuffledQueue();
    currentIndex.current = 0;
    playParagraph();

    return () => {
      tl.current?.kill();
      clearAdvanceDelay();
      pendingAdvance.current = null;
    };
  }, [clearAdvanceDelay, generateShuffledQueue, playParagraph]);

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
