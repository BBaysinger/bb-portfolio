import clsx from "clsx";
import Image from "next/image";
import { forwardRef } from "react";

import BarberPole from "@/components/common/BarberPole";
import headerLogo from "@/images/hero/bb-gradient.webp";

import styles from "./TitleBranding.module.scss";

type TitleBrandingProps = {
  className?: string;
};

/**
 *
 *
 * @author Bradley Baysinger
 * @since The beginning of time.
 * @version N/A
 */
const TitleBranding = forwardRef<HTMLDivElement, TitleBrandingProps>(
  ({ className = "" }, ref) => {
    return (
      <div ref={ref} className={`${styles.titleBranding} ${className}`}>
        <span className={styles.logoWrapper}>
          <div>
            <Image src={headerLogo} className={styles.heroLogo} alt="BB Logo" />
          </div>
        </span>
        <span className={styles.hWrapper}>
          <h1>
            <BarberPole
              className={clsx(styles.barberPole, styles.barberPole1)}
            />
            <div className={clsx(styles.name, styles.firstName)}>Bradley</div>{" "}
            <div className={clsx(styles.name, styles.lastName)}>Baysinger</div>
            <div className={styles.title}>Interactive UI Developer</div>
          </h1>{" "}
        </span>
      </div>
    );
  },
);

TitleBranding.displayName = "TitleBranding";

export default TitleBranding;
