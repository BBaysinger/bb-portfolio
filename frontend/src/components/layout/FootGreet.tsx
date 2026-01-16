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
const FootGreet: React.FC<{ className?: string }> = ({ className = "" }) => {
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
    <div className={clsx(styles.footerGreet)}>
      <p className={clsx(className)}>
        <Image
          src="/images/footer/bb2.jpg"
          className={styles.footerPhoto}
          width={90}
          height={93}
          alt="Bradley's head"
        />
        Thanks for taking time out of your {timeOfDayText}. This site is my
        active project—not just a portfolio, but a platform built from scratch
        in <strong>Next.js</strong>, backed by <strong>Payload CMS</strong>,
        fully headless, and written end-to-end in{" "}
        <strong>TypeScript</strong> across the frontend and backend.
      </p>

      <p>
        It&apos;s a deliberate testbed for work I&apos;ve enjoyed for years:
        original UI systems that push interaction, motion, and behavior past
        conventional patterns.
      </p>

      <p>
        I build <strong>ultra-polished</strong> interfaces with a
        designer&apos;s eye, technical fearlessness, and very few constraints.
        If you&apos;re working on something that has to be <i>exact</i>—or to{" "}
        <i>go beyond</i>—then <Link href="/contact">let&apos;s talk</Link>.
      </p>
    </div>
  );
};

export default FootGreet;
