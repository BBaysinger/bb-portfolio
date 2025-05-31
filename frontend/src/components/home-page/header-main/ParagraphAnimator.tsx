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
  children?: React.ReactNode;
}

const shuffleArray = (array: number[]) => {
  return array.sort(() => Math.random() - 0.5);
};

/**
 *
 *
 * @author Bradley Baysinger
 * @since The beginning of time.
 * @version N/A
 */
const ParagraphAnimator: React.FC<ParagraphAnimatorProps> = ({
  paragraphs,
  interval = 15,
  paragraphDelay = 10000,
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
  const pausedRef = useRef(paused); // ✅ live reference to paused

  // Keep pausedRef current
  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  const generateShuffledQueue = () => shuffleArray(paragraphs.map((_, i) => i));

  const playNextParagraph = () => {
    currentIndex.current++;
    if (currentIndex.current >= queue.current.length) {
      queue.current = generateShuffledQueue();
      currentIndex.current = 0;
    }
    playParagraph();
  };

  const waitThenStart = () => {
    delayTimer.current = window.setTimeout(() => {
      if (pausedRef.current) {
        // Begin polling for resumed state
        poller.current = window.setInterval(() => {
          if (!pausedRef.current) {
            clearInterval(poller.current!);
            poller.current = null;
            playNextParagraph();
          }
        }, 100);
      } else {
        playNextParagraph();
      }
    }, paragraphDelay);
  };

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
          const pos = Math.floor(this.targets()[0].value);
          setVisibleText(paragraph.slice(0, pos));
          setInvisibleText(paragraph.slice(pos));
        },
        onComplete: () => {
          setIsAnimating(false);
          waitThenStart();
        },
      },
    );

    tl.current.to(containerRef.current, {
      opacity: 0,
      duration: 0.5,
      delay: paragraph.length > 0 ? 0 : 0.001,
    });

    tl.current.set(containerRef.current, { opacity: 1 });
  };

  useEffect(() => {
    queue.current = generateShuffledQueue();
    currentIndex.current = 0;
    hasPlayedIntro.current = sessionStorage.getItem(INTRO_KEY) === "true";
    playParagraph();

    return () => {
      tl.current?.kill();
      if (delayTimer.current) clearTimeout(delayTimer.current);
      if (poller.current) clearInterval(poller.current);
    };
  }, []); // Initial mount only

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
      {/* <div className={styles.debug}>paused: [{String(paused)}]</div> */}
    </div>
  );
};

export default ParagraphAnimator;
