import clsx from "clsx";
import React from "react";

import styles from "./OrbThrowTooltip.module.scss";

type Props = {
  className?: string;
  hidden?: boolean;
};

/**
 * Arrow tooltip that appears on the draggable orb to guide first-time users.
 * Hides permanently after the first wall collision to avoid clutter for experienced users.
 *
 */
const OrbThrowTooltip: React.FC<Props> = ({
  className = "",
  hidden = false,
}) => {
  if (hidden) {
    return null;
  }

  return (
    <div className={clsx(styles.orbThrowTooltip, "orbThrowTooltip", className)}>
      {/* Four arrowheads radiating outward while group orbits */}
      <span className={clsx(styles.arrow, styles.arrowA)} />
      <span className={clsx(styles.arrow, styles.arrowB)} />
      <span className={clsx(styles.arrow, styles.arrowC)} />
      <span className={clsx(styles.arrow, styles.arrowD)} />

      {/* Rotating circular text ring around the same center */}
      <svg
        className={styles.textRing}
        viewBox="0 0 100 100"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <path
            id="throwTextPath"
            d="M50,50 m -40,0 a 40,40 0 1,1 80,0 a 40,40 0 1,1 -80,0"
          />
        </defs>
        <text>
          <textPath xlinkHref="#throwTextPath" startOffset="0%">
            {"Give a toss! Give a toss! Give a toss! Give a toss! "}
          </textPath>
        </text>
      </svg>
    </div>
  );
};

export default OrbThrowTooltip;
