"use client";

import React from "react";

import styles from "./Marquee.module.scss";

interface MarqueeProps {
  phrases?: string[];
  repeat?: number;
}

const DEFAULT_PHRASES = ["Default Phrase 1", "Default Phrase 2"];

export default function Marquee({
  phrases = DEFAULT_PHRASES,
  repeat = 1,
}: MarqueeProps) {
  const viewportRef = React.useRef<HTMLDivElement | null>(null);
  const loopRef = React.useRef<HTMLDivElement | null>(null);

  const marqueeItems = React.useMemo(() => {
    const safeRepeat = Math.max(1, repeat);
    return Array.from({ length: safeRepeat }, () => phrases).flat();
  }, [phrases, repeat]);

  const phraseWordItems = React.useMemo(() => {
    return marqueeItems.map((phrase) => {
      const words = phrase.split(/\s+/g).filter(Boolean);
      return { phrase, words };
    });
  }, [marqueeItems]);

  React.useEffect(() => {
    const viewportEl = viewportRef.current;
    const loopEl = loopRef.current;

    if (!viewportEl || !loopEl) return;
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mediaQuery.matches) return;

    let rafId = 0;
    let lastTimeMs = 0;
    let loopWidthPx = 0;

    const measure = () => {
      loopWidthPx = loopEl.getBoundingClientRect().width;
      if (Number.isFinite(loopWidthPx) && loopWidthPx > 0) {
        viewportEl.scrollLeft = viewportEl.scrollLeft % loopWidthPx;
      }
    };

    const resizeObserver = new ResizeObserver(() => {
      measure();
    });
    resizeObserver.observe(loopEl);

    measure();

    const durationSeconds = 32;
    const tick = (timeMs: number) => {
      if (!lastTimeMs) lastTimeMs = timeMs;
      const deltaSeconds = (timeMs - lastTimeMs) / 1000;
      lastTimeMs = timeMs;

      if (loopWidthPx > 0) {
        const pxPerSecond = loopWidthPx / durationSeconds;
        viewportEl.scrollLeft += deltaSeconds * pxPerSecond;
        if (viewportEl.scrollLeft >= loopWidthPx) {
          viewportEl.scrollLeft -= loopWidthPx;
        }
      }

      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
    };
  }, [phraseWordItems]);

  return (
    <section className={styles.marquee} aria-hidden="true">
      <div className={styles.viewport} ref={viewportRef}>
        <div className={styles.track}>
          <div className={styles.loop} ref={loopRef}>
            {phraseWordItems.map(({ phrase, words }, phraseIndex) => (
              <span className={styles.phrase} key={`${phrase}-${phraseIndex}`}>
                {words.map((word, wordIndex) => (
                  <span
                    className={styles.word}
                    key={`${phrase}-${phraseIndex}-${wordIndex}`}
                  >
                    {word}
                  </span>
                ))}
              </span>
            ))}
          </div>
          <div className={styles.loop} aria-hidden="true">
            {phraseWordItems.map(({ phrase, words }, phraseIndex) => (
              <span
                className={styles.phrase}
                key={`${phrase}-${phraseIndex}-dup`}
              >
                {words.map((word, wordIndex) => (
                  <span
                    className={styles.word}
                    key={`${phrase}-${phraseIndex}-${wordIndex}-dup`}
                  >
                    {word}
                  </span>
                ))}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
