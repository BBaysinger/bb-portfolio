"use client";

import { clsx } from "clsx";
import Image from "next/image";
import { useEffect, useState } from "react";

import styles from "./FootGreet.module.scss";

/**
 * The greeting in the footer.
 * Time of day included for an unexpected dynamic.
 *
 */
const FootGreet: React.FC<{ className?: string }> = ({ className = "" }) => {
  const [currentTimeOfDay, setCurrentTimeOfDay] = useState<string>("");

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setCurrentTimeOfDay("morning");
    else if (hour < 18) setCurrentTimeOfDay("afternoon");
    else setCurrentTimeOfDay("evening");
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
        Thanks for exploring this space—every element here is hand-crafted from
        scratch, representing both a portfolio and a living laboratory for
        interactive innovation.
      </p>
      <p>
        What you&apos;ve experienced—the parallax carousel, the magnetic pixel
        grid, the custom sprite renderer—these aren&apos;t just features,
        they&apos;re original systems built to explore what&apos;s possible in
        the browser.
      </p>
      <p>
        I&apos;m passionate about creating digital experiences that reward
        curiosity and exploration. If you&apos;re looking for someone who brings
        systematic innovation, architectural thinking, and an obsessive
        attention to craft—let&apos;s connect and explore what we can build
        together.
      </p>
    </div>
  );
};

export default FootGreet;
