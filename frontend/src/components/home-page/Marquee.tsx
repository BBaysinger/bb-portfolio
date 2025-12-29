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
  repeat = 2,
}: MarqueeProps) {
  const marqueeItems = React.useMemo(() => {
    const safeRepeat = Math.max(2, repeat);
    return Array.from({ length: safeRepeat }, () => phrases).flat();
  }, [phrases, repeat]);

  return (
    <section className={styles.marquee} aria-hidden="true">
      <div className={styles.track}>
        {marqueeItems.map((phrase, index) => (
          <span className={styles.item} key={`${phrase}-${index}`}>
            {phrase}
          </span>
        ))}
      </div>
    </section>
  );
}
