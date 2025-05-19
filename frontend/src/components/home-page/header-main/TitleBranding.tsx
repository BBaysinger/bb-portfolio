import React from "react";

import headerLogo from "images/hero/bb-gradient.webp";
import BarberPole from "components/common/BarberPole";
import styles from "./TitleBranding.module.scss";

type TitleBrandingProps = {
  className?: string;
};

const TitleBranding: React.FC<TitleBrandingProps> = ({ className = "" }) => {
  return (
    <div className={`${styles.titleBranding} ${className}`}>
      <h1>
        <div className={styles.logoWrapper}>
          <div>
            <img src={headerLogo} className={styles.heroLogo} alt="BB Logo" />
          </div>
        </div>
        <BarberPole
          className={[styles.barberPole, styles.barberPole1].join(" ")}
        />
        <span className={styles.firstName}>Bradley</span>&nbsp;{"   "}
        <span className={styles.lastName}>Baysinger</span>
        <BarberPole
          className={[styles.barberPole, styles.barberPole2].join(" ")}
        />
        <span className={styles.title}>Interactive Web Developer</span>
      </h1>
    </div>
  );
};

export default TitleBranding;
