"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import styles from "./FootGreet.module.scss";

/**
 * The greeting in the footer.
 * Time of day included for an unexpected dynamic.
 *
 */
const FootGreet: React.FC<{ className?: string }> = ({ className = "" }) => {
  const [currentTimeOfDay, setCurrentTimeOfDay] = useState<string | null>(null);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setCurrentTimeOfDay("morning");
    else if (hour < 18) setCurrentTimeOfDay("afternoon");
    else setCurrentTimeOfDay("evening");
  }, []);

  return (
    <>
      <p className={className}>
        <Image
          src="/images/footer/bb2.jpg"
          className={styles.footerPhoto}
          width={90}
          height={93}
          alt="Bradley's head"
        />
        {currentTimeOfDay
          ? `Good ${currentTimeOfDay}! This space is always evolving — a bit of an ongoing experiment. Some things might seem mysterious for now, but that's part of the process.`
          : "Thanks for stopping by! This space is always evolving — a bit of an ongoing experiment. Some things might seem mysterious for now, but that's part of the process."}
      </p>
      <p>
        I&apos;m always excited to collaborate with forward-thinking teams who
        care about creating meaningful digital experiences. Let&apos;s connect
        and explore how my approach to interactive design and development can
        bring something distinctive to your organization.
      </p>
    </>
  );
};

export default FootGreet;
