import { useEffect, useRef } from "react";
import gsap from "gsap";

import styles from "./ParagraphAnimator.module.scss";

interface ParagraphAnimatorProps {
  paragraphs: string[];
  interval?: number;
  paragraphDelay?: number;
  initialDelay?: number;
  className?: string;
  paused?: boolean;
}

const shuffleArray = (array: number[]) => {
  return array.sort(() => Math.random() - 0.5);
};

const ParagraphAnimator: React.FC<ParagraphAnimatorProps> = ({
  paragraphs,
  interval = 15,
  paragraphDelay = 20000,
  initialDelay = 8000,
  className,
  paused = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const tl = useRef<gsap.core.Timeline | null>(null);
  const currentIndex = useRef(0);
  const queue = useRef(shuffleArray([...Array(paragraphs.length).keys()]));

  const playParagraph = () => {
    const paragraph = paragraphs[queue.current[currentIndex.current]];
    const p = containerRef.current?.querySelector("p");

    if (!p) return;

    let spanPosition = 0;

    const updateText = () => {
      const visible = paragraph.slice(0, spanPosition);
      const invisible = paragraph.slice(spanPosition);
      p.innerHTML = `<span>${visible}</span>${invisible}`;
    };

    updateText(); // Initial render

    tl.current = gsap.timeline({
      onComplete: () => {
        currentIndex.current++;
        if (currentIndex.current >= queue.current.length) {
          queue.current = shuffleArray([...Array(paragraphs.length).keys()]);
          currentIndex.current = 0;
        }
        playParagraph(); // loop again
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

    tl.current.to({}, { duration: (paragraphDelay - 10000) / 1000 });
    tl.current.to(containerRef.current, { opacity: 0, duration: 0.5 });
    tl.current.set(containerRef.current, { opacity: 1 });
  };

  useEffect(() => {
    playParagraph();
    return () => {
      tl.current?.kill();
    };
  }, [paragraphs]);

  useEffect(() => {
    if (paused) {
      tl.current?.pause();
    } else {
      tl.current?.play();
    }
  }, [paused]);

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
