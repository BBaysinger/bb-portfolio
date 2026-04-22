import clsx from "clsx";
import { forwardRef } from "react";

import BarberPole from "@/components/common/BarberPole";
import { RawImg } from "@/components/common/RawImg";

import styles from "./HeroLockup.module.scss";

type HeroLockupProps = {
  className?: string;
  initialRoleTitle?: string;
};

const DEFAULT_ROLE_TITLE = "Front-End / UI Developer";

/**
 * HeroLockup component
 *
 * Renders the hero-specific brand lockup, including the BB logo,
 * animated barber pole accent, and the site owner's name and title.
 */
const HeroLockup = forwardRef<HTMLDivElement, HeroLockupProps>(
  ({ className = "", initialRoleTitle }, ref) => {
    const activeRoleText =
      typeof initialRoleTitle === "string" && initialRoleTitle.trim()
        ? initialRoleTitle.trim()
        : DEFAULT_ROLE_TITLE;

    const handleHeroReset = () => {
      try {
        sessionStorage.removeItem("hasDragged");
        sessionStorage.removeItem("hasCollided");
        sessionStorage.removeItem("hasAfterCollidedDelay");
      } catch {
        // ignore storage errors
      }
    };

    const handleKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleHeroReset();
      }
    };

    return (
      <div ref={ref} className={clsx(styles.heroLockup, className)}>
        <span className={styles.logoWrapper}>
          <div>
            <RawImg
              src={"/images/hero/bb-gradient.webp"}
              className={styles.heroLogo}
              alt="BB Logo"
            />
          </div>
        </span>
        <span className={styles.hWrapper}>
          <h1>
            <BarberPole
              className={clsx(styles.barberPole, styles.barberPole1)}
              role="button"
              tabIndex={0}
              aria-label="Reset hero"
              title="Reset hero"
              onClick={handleHeroReset}
              onKeyDown={handleKeyDown}
            />
            <div className={clsx(styles.name, styles.firstName)}>Bradley</div>{" "}
            <div className={clsx(styles.name, styles.lastName)}>Baysinger</div>
            <div className={styles.title}>{activeRoleText}</div>
          </h1>{" "}
        </span>
      </div>
    );
  },
);

HeroLockup.displayName = "HeroLockup";

export default HeroLockup;
