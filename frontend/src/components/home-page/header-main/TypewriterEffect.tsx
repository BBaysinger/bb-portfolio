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
  introMessage?: string;
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
 * before advancing to the next paragraph (shuffled). Supports an optional
 * intro message and pause-aware advancement.
 */
const TypewriterEffect: React.FC<TypewriterEffectProps> = ({
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
    generateShuffledQueue,
    initialDelay,
    interval,
    introMessage,
    paragraphDelay,
    paragraphs,
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
