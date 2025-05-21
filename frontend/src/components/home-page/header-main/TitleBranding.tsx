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
      <span className={styles.logoWrapper}>
        <div>
          <img src={headerLogo} className={styles.heroLogo} alt="BB Logo" />
        </div>
      </span>
      <span className={styles.hWrapper}>
        <BarberPole
          className={[styles.barberPole, styles.barberPole1].join(" ")}
        />
        <h1>
          <div className={styles.firstName}>Bradley</div>&nbsp;{" "}
          <div className={styles.lastName}>Baysinger</div>
        </h1>
        <BarberPole
          className={[styles.barberPole, styles.barberPole2].join(" ")}
        />
        <div className={styles.title}>Interactive Front-end Developer</div>
      </span>
    </div>
  );
};

export default TitleBranding;
