import clsx from "clsx";
import { forwardRef, useEffect, useMemo, useState } from "react";

import BarberPole from "@/components/common/BarberPole";
import { RawImg } from "@/components/common/RawImg";

import styles from "./TitleBranding.module.scss";

type TitleBrandingProps = {
  className?: string;
};

type HeroBrandingResponse = {
  success: boolean;
  data?: {
    activeRoleTitle?: string;
    activeRoleLetterSpacingEm?: number;
  };
};

const DEFAULT_ROLE_TITLE = "Front-End / UI Developer";

const safeSpacing = (value: unknown, fallback = 0.12) => {
  if (typeof value !== "number" || Number.isNaN(value)) return fallback;
  return Math.max(-0.2, Math.min(0.4, value));
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
    const [roleTitle, setRoleTitle] = useState<string>(DEFAULT_ROLE_TITLE);
    const [roleLetterSpacing, setRoleLetterSpacing] = useState<number>(0.12);

    useEffect(() => {
      let cancelled = false;

      const fetchHeroBranding = async () => {
        try {
          const response = await fetch("/api/hero-branding/", {
            method: "GET",
            headers: { Accept: "application/json" },
            cache: "no-store",
          });

          if (!response.ok) return;

          const payload: HeroBrandingResponse = await response.json();
          if (!payload.success || !payload.data || cancelled) return;

          const nextRoleTitle =
            typeof payload.data.activeRoleTitle === "string" &&
            payload.data.activeRoleTitle.trim()
              ? payload.data.activeRoleTitle.trim()
              : DEFAULT_ROLE_TITLE;

          setRoleTitle(nextRoleTitle);
          setRoleLetterSpacing(
            safeSpacing(payload.data.activeRoleLetterSpacingEm, 0.12),
          );
        } catch {
          // Keep defaults when fetch fails.
        }
      };

      void fetchHeroBranding();

      return () => {
        cancelled = true;
      };
    }, []);

    const activeRoleText = useMemo(() => roleTitle, [roleTitle]);
    const activeLetterSpacing = useMemo(
      () => roleLetterSpacing,
      [roleLetterSpacing],
    );

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
      <div ref={ref} className={clsx(styles.titleBranding, className)}>
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
            <div
              className={styles.title}
              style={{
                ["--role-letter-spacing" as string]: `${activeLetterSpacing}em`,
              }}
            >
              {activeRoleText}
            </div>
          </h1>{" "}
        </span>
      </div>
    );
  },
);

TitleBranding.displayName = "TitleBranding";

export default TitleBranding;
