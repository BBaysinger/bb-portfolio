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
      <div className={styles.logoWrapper}>
        <div>
          <img src={headerLogo} className={styles.heroLogo} alt="BB Logo" />
        </div>
      </div>
      <h1>
        <span className={styles.firstName}>Bradley</span>{" "}
        <span className={styles.lastName}>Baysinger</span>
        <BarberPole className={styles.barberPole} />
        <span className={styles.title}>Interactive Web Developer</span>
      </h1>

      {/* <h5 className={styles.subhead}></h5> */}
    </div>
  );
};

export default TitleBranding;
