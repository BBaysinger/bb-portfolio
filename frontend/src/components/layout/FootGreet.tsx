"use client";

import clsx from "clsx";
import Image from "next/image";
import Link from "next/link";
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
 * - Afternoon: 12-16 hours
 * - Evening: 17-23 hours
 */
const FootGreet: React.FC<{ _className?: string }> = ({ _className = "" }) => {
  const [currentTimeOfDay, setCurrentTimeOfDay] = useState<string>("");
  const timeOfDayText = currentTimeOfDay || "day";

  useEffect(() => {
    const rafId = requestAnimationFrame(() => {
      const hour = new Date().getHours();
      if (hour < 12) setCurrentTimeOfDay("morning");
      else if (hour < 17) setCurrentTimeOfDay("afternoon");
      else setCurrentTimeOfDay("evening");
    });

    return () => cancelAnimationFrame(rafId);
  }, []);

  return (
    <div className={clsx(styles.footerGreet, _className)}>
      <div className={styles.photoColumn}>
        <Image
          src="/images/footer/bb2.jpg"
          className={styles.footerPhoto}
          width={90}
          height={93}
          alt="Bradley's head"
        />
      </div>
      <div className={styles.textColumn}>
        <p>
          Thanks for taking time out of your {timeOfDayText}. This site is still
          in progress. It's built from scratch in <strong>Next.js</strong>,
          backed by <strong>Payload CMS</strong>, fully headless, and written
          end-to-end in <strong>TypeScript</strong>.
        </p>
        <p>
          I hope you enjoy my work. I can't post all of it here, but there's
          always more on the way. Stop in again sometime, and if something
          resonates with you, please <Link href="/contact">reach&nbsp;out</Link>!
        </p>
      </div>
    </div>
  );
};

export default FootGreet;
