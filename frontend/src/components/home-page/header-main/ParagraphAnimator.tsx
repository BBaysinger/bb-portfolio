import { useEffect, useRef, useState } from "react";
import gsap from "gsap";

import styles from "./ParagraphAnimator.module.scss";

const INTRO_KEY = "paragraphAnimator:introPlayed";

interface ParagraphAnimatorProps {
  paragraphs: string[];
  interval?: number;
  paragraphDelay?: number;
  initialDelay?: number;
  className?: string;
  paused?: boolean;
  introMessage?: string;
  style?: React.CSSProperties;
}

const shuffleArray = (array: number[]) => {
  return array.sort(() => Math.random() - 0.5);
};

const ParagraphAnimator: React.FC<ParagraphAnimatorProps> = ({
  paragraphs,
  interval = 15,
  paragraphDelay = 20000,
  initialDelay = 1000,
  className,
  paused = false,
  introMessage,
  style,
}) => {
  const [visibleText, setVisibleText] = useState("");
  const [invisibleText, setInvisibleText] = useState("");
  const [isAnimating, setIsAnimating] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const tl = useRef<gsap.core.Timeline | null>(null);
  const currentIndex = useRef(0);
  const queue = useRef<number[]>([]);
  const hasPlayedIntro = useRef(false);

  const generateShuffledQueue = () => shuffleArray(paragraphs.map((_, i) => i));

  const playParagraph = () => {
    let paragraph: string;

    if (!hasPlayedIntro.current && introMessage) {
      paragraph = introMessage;
      hasPlayedIntro.current = true;
      sessionStorage.setItem(INTRO_KEY, "true");
    } else {
      paragraph = paragraphs[queue.current[currentIndex.current]];
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
          const spanPosition = Math.floor(this.targets()[0].value);
          setVisibleText(paragraph.slice(0, spanPosition));
          setInvisibleText(paragraph.slice(spanPosition));
        },
        onComplete() {
          setIsAnimating(false);
        },
      },
    );

    tl.current.to({}, { duration: paragraphDelay / 1000 });
    tl.current.to(containerRef.current, { opacity: 0, duration: 0.5 });
    tl.current.set(containerRef.current, { opacity: 1 });

    tl.current.to(
      {},
      {
        duration: 0.001,
        onComplete: () => {
          currentIndex.current++;
          if (currentIndex.current >= queue.current.length) {
            queue.current = shuffleArray(paragraphs.map((_, i) => i));
            currentIndex.current = 0;
          }
          setTimeout(playParagraph, 50);
        },
      },
    );
  };

  useEffect(() => {
    if (paused) {
      tl.current?.pause();
    } else {
      tl.current?.play();
    }
  }, [paused]);

  useEffect(() => {
    queue.current = generateShuffledQueue();
    currentIndex.current = 0;

    hasPlayedIntro.current = sessionStorage.getItem(INTRO_KEY) === "true";

    playParagraph();

    return () => {
      tl.current?.kill();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`${styles.paragraphAnimator} ${className} ${paused ? styles.paused : ""}`}
      style={{ ...style }}
    >
      <p className={styles.paragraphLine}>
        <span className={styles.visible}>{visibleText}</span>
        <span
          className={`${styles.cursor} ${isAnimating ? styles.cursorSolid : ""}`}
        />{" "}
        <span className={styles.invisible}>{invisibleText}</span>
      </p>
    </div>
  );
};

export default ParagraphAnimator;
