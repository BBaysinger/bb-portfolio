import clsx from "clsx";
import React from "react";

import styles from "./OrbTossTooltip.module.scss";

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
      {/* Four inline SVG arrowheads using currentColor */}
      <span className={clsx(styles.arrow, styles.arrowA)}>
        <svg
          className={styles.arrowSvg}
          viewBox="0 0 61.71 41.89"
          aria-hidden="true"
          focusable="false"
        >
          <polygon
            points="43.07 12.2 43.09 1.26 18.61 1.26 18.63 12.2 3.03 12.2 30.84 40.1 58.67 12.2 43.07 12.2"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeMiterlimit={9.91}
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </span>
      <span className={clsx(styles.arrow, styles.arrowB)}>
        <svg
          className={styles.arrowSvg}
          viewBox="0 0 61.71 41.89"
          aria-hidden="true"
          focusable="false"
        >
          <polygon
            points="43.07 12.2 43.09 1.26 18.61 1.26 18.63 12.2 3.03 12.2 30.84 40.1 58.67 12.2 43.07 12.2"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeMiterlimit={9.91}
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </span>
      <span className={clsx(styles.arrow, styles.arrowC)}>
        <svg
          className={styles.arrowSvg}
          viewBox="0 0 61.71 41.89"
          aria-hidden="true"
          focusable="false"
        >
          <polygon
            points="43.07 12.2 43.09 1.26 18.61 1.26 18.63 12.2 3.03 12.2 30.84 40.1 58.67 12.2 43.07 12.2"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeMiterlimit={9.91}
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </span>
      <span className={clsx(styles.arrow, styles.arrowD)}>
        <svg
          className={styles.arrowSvg}
          viewBox="0 0 61.71 41.89"
          aria-hidden="true"
          focusable="false"
        >
          <polygon
            points="43.07 12.2 43.09 1.26 18.61 1.26 18.63 12.2 3.03 12.2 30.84 40.1 58.67 12.2 43.07 12.2"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeMiterlimit={9.91}
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </span>

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
