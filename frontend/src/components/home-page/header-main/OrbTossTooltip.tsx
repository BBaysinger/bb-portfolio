/**
 * Decorative “toss the orb” tooltip.
 *
 * Rendered inside the hero slinger/orb as an onboarding hint after first drag.
 * The parent controls visibility (e.g., hides permanently after first collision).
 *
 * This component is intentionally non-interactive and should not be announced by
 * assistive tech.
 */

import clsx from "clsx";

import styles from "./OrbTossTooltip.module.scss";
import OrbTossTooltipArrow from "./OrbTossTooltipArrow";

type Props = {
  className?: string;
  hidden?: boolean;
};

/**
 * OrbTossTooltip
 *
 * Animated toss arrow affordance: four radiating arrowheads orbiting the orb center
 * plus a circular rotating text ring. Visible only while dragging after first drag,
 * and before the first collision. Hidden permanently after wall collision.
 */
function OrbTossTooltip({ className, hidden = false }: Props) {
  if (hidden) {
    // Avoid rendering any DOM when hidden to keep the orb subtree minimal.
    return null;
  }

  return (
    <div
      aria-hidden="true"
      className={clsx(styles.orbTossTooltip, "orbTossTooltip", className)}
    >
      {/* Arrow orbit group (independent rotation so we can reverse only arrows) */}
      <div className={styles.arrowOrbit}>
        <span className={clsx(styles.arrow, styles.arrowA)}>
          <OrbTossTooltipArrow />
        </span>
        <span className={clsx(styles.arrow, styles.arrowB)}>
          <OrbTossTooltipArrow />
        </span>
        <span className={clsx(styles.arrow, styles.arrowC)}>
          <OrbTossTooltipArrow />
        </span>
        <span className={clsx(styles.arrow, styles.arrowD)}>
          <OrbTossTooltipArrow />
        </span>
      </div>

      {/* Rotating circular text ring */}
      <svg
        className={styles.textRing}
        viewBox="-8 -8 116 116"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <path
            id="tossTextPath"
            d="M50,50 m -48,0 a 48,48 0 1,1 96,0 a 48,48 0 1,1 -96,0"
          />
        </defs>
        <text>
          <textPath xlinkHref="#tossTextPath" startOffset="0%">
            {"Give a toss! Give a toss! Give a toss! "}
          </textPath>
        </text>
      </svg>
    </div>
  );
}

export default OrbTossTooltip;
