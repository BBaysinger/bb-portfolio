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
        {/* <img src={headerLogo} className={styles.heroLogo} alt="BB Logo" /> */}
      </div>
      <div className={styles.test}></div>
      <h1>
        <span className={styles.firstName}>Bradley</span>{" "}
        <span className={"nobr"}>
          <BarberPole className={styles.barberPole} />{" "}
          <span className={styles.lastName}>Baysinger</span>
        </span>
      </h1>

      <h5 className={styles.subhead}>
        Interactive&nbsp;Web <span className={styles.bull}>&bull;</span>{" "}
        <span className={"nobr"}>Front-end Developer</span>
      </h5>
    </div>
  );
};

export default TitleBranding;
