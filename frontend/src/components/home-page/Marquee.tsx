"use client";

import React from "react";

import styles from "./Marquee.module.scss";

interface MarqueeProps {
  /** List of phrases to render in the marquee. */
  phrases?: string[];

  /** How many times to repeat `phrases` within a single loop (min 1). */
  repeat?: number;
}

const DEFAULT_PHRASES = ["Default Phrase 1", "Default Phrase 2"];

/**
 * Marquee
 *
 * Decorative, continuously scrolling phrase strip used on the home page.
 * - Animation is implemented by incrementing `scrollLeft` on a viewport element.
 * - Content is duplicated to create a seamless loop with no visible gap.
 * - Respects `prefers-reduced-motion` by disabling animation.
 * - Marked `aria-hidden` because it does not convey essential information.
 */
export default function Marquee({
  phrases = DEFAULT_PHRASES,
  repeat = 1,
}: MarqueeProps) {
  // Scroll container (we animate via `scrollLeft` for broad browser support).
  const viewportRef = React.useRef<HTMLDivElement | null>(null);

  // The width of this element is treated as one full “loop” of marquee content.
  const loopRef = React.useRef<HTMLDivElement | null>(null);

  const marqueeItems = React.useMemo(() => {
    // Defensive: always render at least one copy.
    const safeRepeat = Math.max(1, repeat);
    return Array.from({ length: safeRepeat }, () => phrases).flat();
  }, [phrases, repeat]);

  const phraseWordItems = React.useMemo(() => {
    // Split into words so SCSS can style spacing/typography per word.
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

    // Respect OS-level reduced-motion preference by disabling animation entirely.
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mediaQuery.matches) return;

    let rafId = 0;
    let lastTimeMs = 0;
    let loopWidthPx = 0;

    const measure = () => {
      // The loop width can change with responsive layout/font loading.
      loopWidthPx = loopEl.getBoundingClientRect().width;
      if (Number.isFinite(loopWidthPx) && loopWidthPx > 0) {
        // Keep scrollLeft bounded so it doesn't grow without limit.
        viewportEl.scrollLeft = viewportEl.scrollLeft % loopWidthPx;
      }
    };

    const resizeObserver = new ResizeObserver(() => {
      measure();
    });
    resizeObserver.observe(loopEl);

    measure();

    // “Speed” is derived from measured content width so the loop duration stays stable
    // even if phrases change or responsive styles affect widths.
    const durationSeconds = 32;
    const tick = (timeMs: number) => {
      if (!lastTimeMs) lastTimeMs = timeMs;
      const deltaSeconds = (timeMs - lastTimeMs) / 1000;
      lastTimeMs = timeMs;

      if (loopWidthPx > 0) {
        const pxPerSecond = loopWidthPx / durationSeconds;
        viewportEl.scrollLeft += deltaSeconds * pxPerSecond;

        // When we scroll past one loop-width, wrap around seamlessly.
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
    // Decorative marquee: screen readers should ignore it.
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
          {/*
            Duplicate the loop so as the first loop scrolls out of view, the second
            loop is already visible, creating a continuous marquee with no gap.
          */}
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
