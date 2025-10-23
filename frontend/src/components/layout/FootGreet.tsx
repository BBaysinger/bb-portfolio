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
        Thanks for stopping by! This space is always evolving — a bit of an
        ongoing experiment. As you can probably tell, I&apos;m passionate about
        crafting engaging digital experiences that blend creativity with
        functionality.
      </p>
      <p>
        I&apos;m always excited to collaborate with forward-thinking teams who
        care about creating meaningful digital experiences. Let&apos;s connect
        and explore how my approach to interactive design and development can
        bring something distinctive to your organization.
      </p>
    </div>
  );
};

export default FootGreet;
