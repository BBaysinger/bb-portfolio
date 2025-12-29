"use client";

import { clsx } from "clsx";
import Image from "next/image";
import { useEffect, useState } from "react";

import styles from "./FootGreet.module.scss";

/**
 * Footer greeting component with dynamic time-based messaging
 *
 * Displays a personalized footer message that includes time-of-day awareness
 * (morning/afternoon/evening) along with Bradley's photo and portfolio philosophy.
 *
 * @component
 * @param {Object} props - Component props
 * @param {string} [props.className=""] - Additional CSS classes to apply
 *
 * @example
 * ```tsx
 * <FootGreet className="custom-footer-styling" />
 * ```
 *
 * Features:
 * - Dynamic greeting based on current time of day
 * - Personal photo and introduction
 * - Portfolio philosophy and call-to-action
 * - Hydration-safe time calculation (runs in useEffect)
 * - Responsive text layout
 *
 * Time Logic:
 * - Morning: 0-11 hours
 * - Afternoon: 12-17 hours
 * - Evening: 18-23 hours
 */
const FootGreet: React.FC<{ className?: string }> = ({ className = "" }) => {
  const [currentTimeOfDay, setCurrentTimeOfDay] = useState<string>("");

  useEffect(() => {
    const rafId = requestAnimationFrame(() => {
      const hour = new Date().getHours();
      if (hour < 12) setCurrentTimeOfDay("morning");
      else if (hour < 18) setCurrentTimeOfDay("afternoon");
      else setCurrentTimeOfDay("evening");
    });

    return () => cancelAnimationFrame(rafId);
  }, []);

  return (
    <div className={clsx(styles.footerGreet)}>
      <p className={clsx(className)}>
        <Image
          src="/images/footer/bb2.jpg"
          className={styles.footerPhoto}
          width={90}
          height={93}
          alt="Bradley's head"
        />
        {`Good ${currentTimeOfDay}! `}
        Thanks for exploring this space—every element here is hand-crafted and
        home-baked from scratch, though not exactly from grandmother's recipes.
        It represents a portfolio and a living laboratory for interactive
        innovation, as well as new ground broken in full-stack development. But
        I'm just getting started.
      </p>
      {/* <p>
        What you experience here—the parallax carousel, the magnetic pixel grid,
        the custom sprite sheet animator—these aren&apos;t just features,
        they&apos;re original systems built to explore what&apos;s possible in
        the browser.
      </p> */}
      <p>
        I&apos;m passionate about creating intuitive UI concepts, but my
        capabilities can go beyond that. If you&apos;re looking for someone who
        brings systematic innovation, architectural thinking, and an obsessive
        attention to craft—let&apos;s connect and explore what we can build
        together.
      </p>
    </div>
  );
};

export default FootGreet;
