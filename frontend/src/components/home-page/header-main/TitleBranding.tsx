import clsx from "clsx";
import { forwardRef } from "react";

import BarberPole from "@/components/common/BarberPole";
import { RawImg } from "@/components/common/RawImg";

import styles from "./TitleBranding.module.scss";

type TitleBrandingProps = {
  className?: string;
};

/**
 * TitleBranding component
 *
 * Renders the site branding for the homepage hero section, including the BB logo,
 * animated barber pole accent, and the site owner's name and title.
 *
 * This component overlays the Fluxel grid on the home screen and serves as
 * the main identity marker for the user. It is typically placed in the hero section.
 *
 * @component
 * @example
 * <TitleBranding />
 *
 * @param {TitleBrandingProps} props
 * @param {string} [props.className] - Optional additional className(s) to append to the wrapper.
 * @param {React.Ref<HTMLDivElement>} ref - Forwarded ref to the root div.
 *
 */
const TitleBranding = forwardRef<HTMLDivElement, TitleBrandingProps>(
  ({ className = "" }, ref) => {
    const handleHeroReset = () => {
      // Minimal reset: clear session-scoped flags so the next interaction behaves like first visit
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
      <div ref={ref} className={`${styles.titleBranding} ${className}`}>
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
            <div className={styles.title}>Front-end / UI Developer</div>
          </h1>{" "}
        </span>
      </div>
    );
  },
);

TitleBranding.displayName = "TitleBranding";

export default TitleBranding;
