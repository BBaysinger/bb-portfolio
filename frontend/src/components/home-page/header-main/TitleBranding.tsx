import { forwardRef } from "react";
import headerLogo from "images/hero/bb-gradient.webp";
import BarberPole from "components/common/BarberPole";
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
            <img src={headerLogo} className={styles.heroLogo} alt="BB Logo" />
          </div>
        </span>
        <span className={styles.hWrapper}>
          <h1>
            <BarberPole
              className={[styles.barberPole, styles.barberPole1].join(" ")}
            />
            <div className={[styles.name, styles.firstName].join(" ")}>
              Bradley
            </div>{" "}
            <div className={[styles.name, styles.lastName].join(" ")}>
              Baysinger
            </div>
            <div className={styles.title}>
              {" "}
              <BarberPole
                className={[styles.barberPole, styles.barberPole2].join(" ")}
              />
              Interactive UI Developer
            </div>
          </h1>
        </span>
      </div>
    );
  },
);

export default TitleBranding;
