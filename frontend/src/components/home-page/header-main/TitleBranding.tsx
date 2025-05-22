import { forwardRef } from "react";
import headerLogo from "images/hero/bb-gradient.webp";
import BarberPole from "components/common/BarberPole";
import styles from "./TitleBranding.module.scss";

type TitleBrandingProps = {
  className?: string;
};

const TitleBranding = forwardRef<HTMLDivElement, TitleBrandingProps>(
  ({ className = "" }, ref) => {
    return (
      <div ref={ref} className={`${styles.titleBranding} ${className}`}>
        <span className={styles.logoWrapper}>
          <div>
            <img src={headerLogo} className={styles.heroLogo} alt="BB Logo" />
          </div>
        </span>
        <span className={styles.hWrapper}>
          <h1>
            <BarberPole
              className={[styles.barberPole, styles.barberPole1].join(" ")}
            />
            <div className={styles.firstName}>Bradley</div>{" "}
            <div className={styles.lastName}>Baysinger</div>
            <BarberPole
              className={[styles.barberPole, styles.barberPole2].join(" ")}
            />
            <div className={styles.title}>Interactive Front-end Developer</div>
          </h1>
        </span>
      </div>
    );
  },
);

export default TitleBranding;
