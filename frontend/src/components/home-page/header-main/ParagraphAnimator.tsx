import gsap from "gsap";
import { useEffect, useRef, useState, useCallback } from "react";

import styles from "./ParagraphAnimator.module.scss";

interface ParagraphAnimatorProps {
  paragraphs: string[];
  interval?: number;
  paragraphDelay?: number;
  initialDelay?: number;
  className?: string;
  paused?: boolean;
  introMessage?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

const shuffleArray = (array: number[]) => {
  return array.sort(() => Math.random() - 0.5);
};

/**
 * ParagraphAnimator
 *
 * Animates a list of paragraphs using a typewriter-style effect,
 * displaying one paragraph at a time with optional delays.
 * Pausing prevents the next paragraph from starting, but does not interrupt
 * any in-progress animations or delay timers. Includes optional intro message,
 * initial delay, and configurable interval between characters.
 *
 * Usage:
 * - Pass an array of strings via `paragraphs`
 * - Optionally include `introMessage` to show before shuffling begins
 * - Use the `paused` prop to prevent advancing to the next paragraph
 *
 * Example behavior:
 * Typing starts → finishes → waits → if `paused === false`, show next.
 * If `paused === true`, waits until unpaused before continuing.
 *
 */
const ParagraphAnimator: React.FC<ParagraphAnimatorProps> = ({
  paragraphs,
  interval = 15,
  paragraphDelay = 20000,
  initialDelay = 1000,
  className,
  paused = false,
  introMessage,
  children,
}) => {
  const [visibleText, setVisibleText] = useState("");
  const [invisibleText, setInvisibleText] = useState("");
  const [isAnimating, setIsAnimating] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const tl = useRef<gsap.core.Timeline | null>(null);
  const currentIndex = useRef(0);
  const queue = useRef<number[]>([]);
  const hasPlayedIntro = useRef(false);
  const delayTimer = useRef<number | null>(null);
  const poller = useRef<number | null>(null);
  const pausedRef = useRef(paused);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  const generateShuffledQueue = useCallback(
    () => shuffleArray(paragraphs.map((_, i) => i)),
    [paragraphs],
  );

  const playParagraph = useCallback(() => {
    let paragraph: string;

    if (!hasPlayedIntro.current && introMessage) {
      paragraph = introMessage;
      hasPlayedIntro.current = true;
    } else {
      const index = queue.current[currentIndex.current];
      paragraph = paragraphs[index];
    }

    if (!paragraph) return;

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
            const next = () => {
              currentIndex.current++;
              if (currentIndex.current >= queue.current.length) {
                queue.current = generateShuffledQueue();
                currentIndex.current = 0;
              }
              playParagraph();
            };

            if (pausedRef.current) {
              poller.current = window.setInterval(() => {
                if (!pausedRef.current) {
                  clearInterval(poller.current!);
                  poller.current = null;
                  next();
                }
              }, 100);
            } else {
              next();
            }
          }, paragraphDelay);
        },
      },
    );
  }, [
    introMessage,
    interval,
    initialDelay,
    paragraphs,
    paragraphDelay,
    generateShuffledQueue,
  ]);

  useEffect(() => {
    queue.current = generateShuffledQueue();
    currentIndex.current = 0;
    hasPlayedIntro.current = false;
    playParagraph();

    return () => {
      tl.current?.kill();
      if (delayTimer.current) clearTimeout(delayTimer.current);
      if (poller.current) clearInterval(poller.current);
    };
  }, [generateShuffledQueue, playParagraph]);

  return (
    <div
      ref={containerRef}
      className={`${styles.paragraphAnimator} ${className || ""}`}
    >
      <p className={styles.paragraphLine}>
        <span className={styles.visible}>{visibleText}</span>
        <span
          className={`${styles.cursor} ${isAnimating ? styles.cursorSolid : ""}`}
        />{" "}
        <span className={styles.invisible}>{invisibleText}</span>
      </p>
      <div>{children}</div>
    </div>
  );
};

export default ParagraphAnimator;
