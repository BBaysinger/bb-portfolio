import clsx from "clsx";
import React from "react";

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
const OrbTossTooltip: React.FC<Props> = ({
  className = "",
  hidden = false,
}) => {
  if (hidden) return null;

  return (
    <div className={clsx(styles.orbTossTooltip, "orbTossTooltip", className)}>
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
        viewBox="0 0 100 100"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <path
            id="tossTextPath"
            d="M50,50 m -40,0 a 40,40 0 1,1 80,0 a 40,40 0 1,1 -80,0"
          />
        </defs>
        <text>
          <textPath xlinkHref="#tossTextPath" startOffset="0%">
            {"Give a toss! Give a toss! Give a toss! Give a toss! "}
          </textPath>
        </text>
      </svg>
    </div>
  );
};

export default OrbTossTooltip;
