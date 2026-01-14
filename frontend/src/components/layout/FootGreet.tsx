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
 * - Afternoon: 12-17 hours
 * - Evening: 18-23 hours
 */
const FootGreet: React.FC<{ className?: string }> = ({ className = "" }) => {
  const [currentTimeOfDay, setCurrentTimeOfDay] = useState<string>("");
  const timeOfDayText = currentTimeOfDay || "day";

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
        Thanks for taking time out of your {timeOfDayText}! This site is my
        active project—not just a portfolio, but a platform built from scratch
        in <strong>Next.js</strong> and backed by <strong>Payload CMS</strong>.
        It's fully <strong>headless</strong> and <strong>TypeScript</strong> end
        -to-end, on the frontend and backend.
      </p>
      <p>
        It's a new direction for me, and a testbed for work I've loved
        for a long time: original UI concepts that push interaction design,
        motion, and behavior past conventional patterns.
      </p>
      <p>
        I deliver <strong>ultra-polished</strong> interfaces with the eye of a
        designer, fearlessness, and few technical constraints. Do you have
        something that has to be <i>just right</i>—or <i>go beyond</i>? Then{" "}
        <Link href="/contact">let's&nbsp;talk</Link>.
      </p>
    </div>
  );
};

export default FootGreet;
