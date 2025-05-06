import { useEffect, useRef } from "react";
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
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const tl = useRef<gsap.core.Timeline | null>(null);
  const currentIndex = useRef(0);
  const queue = useRef<number[]>([]);
  const hasPlayedIntro = useRef(false);

  const playParagraph = () => {
    let paragraph: string;

    if (!introMessage && paragraphs.length === 0) return;
    // Play intro message once, if defined
    if (introMessage && !hasPlayedIntro.current) {
      paragraph = introMessage;
      hasPlayedIntro.current = true;
    } else {
      paragraph = paragraphs[queue.current[currentIndex.current]];
    }

    const p = containerRef.current?.querySelector("p");
    if (!p) return;

    let spanPosition = 0;

    const formatText = (text: string) => text.replace(/\\n|\n/g, "<br />");

    const updateText = () => {
      const visible = paragraph.slice(0, spanPosition);
      const invisible = paragraph.slice(spanPosition);

      p.innerHTML = `<span>${formatText(visible)}</span>${formatText(invisible)}`;
    };

    updateText(); // Initial render

    tl.current = gsap.timeline({
      onComplete: () => {
        // Only advance queue if we're in the main loop
        if (hasPlayedIntro.current) {
          currentIndex.current++;
          if (currentIndex.current >= queue.current.length) {
            queue.current = shuffleArray([...Array(paragraphs.length).keys()]);
            currentIndex.current = 0;
          }
        }
        playParagraph();
      },
    });

    tl.current.to({}, { duration: initialDelay / 1000 });

    tl.current.to(
      { value: 0 },
      {
        value: paragraph.length,
        duration: (paragraph.length * interval) / 1000,
        ease: "none",
        onUpdate() {
          spanPosition = Math.floor(this.targets()[0].value);
          updateText();
        },
      },
    );

    tl.current.to({}, { duration: paragraphDelay / 1000 });
    tl.current.to(containerRef.current, { opacity: 0, duration: 0.5 });
    tl.current.set(containerRef.current, { opacity: 1 });
  };

  useEffect(() => {
    if (paused) {
      tl.current?.pause();
    } else {
      tl.current?.play();
    }
  }, [paused]);

  useEffect(() => {
    const baseQueue = [...Array(paragraphs.length).keys()];
    queue.current = shuffleArray(baseQueue);
    currentIndex.current = 0;

    const storedValue = localStorage.getItem(INTRO_KEY);
    hasPlayedIntro.current = storedValue === "true";
    hasPlayedIntro.current = false;

    playParagraph();

    return () => {
      tl.current?.kill();
    };
  }, [paragraphs, introMessage]);

  return (
    <div
      ref={containerRef}
      className={`${styles.paragraphAnimator} ${className}`}
    >
      <p>
        <span />
      </p>
    </div>
  );
};

export default ParagraphAnimator;
