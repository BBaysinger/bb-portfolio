import React from "react";

import styles from "./Shadow.module.scss";

interface ShadowProps {
  className?: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

// Accounts for blur radius to keep the shadow completely out of view,
// without hardcoding the value.
const BLUR_OFFSET = 0;

/**
 * Registration is set to the corner of the origin of the shadows, and
 * positioned to the top right of the fluxel.
 *
 * @author Bradley Baysinger
 * @since The beginning of time.
 * @version N/A
 */
const Shadow: React.FC<ShadowProps> = ({ className, x1, y1, x2, y2 }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1in"
      height="1in"
      viewBox="0 0 72 72"
      className={`${styles["shadow"]} ${className}`}
    >
      <g filter="url(#fluxelShadowBlur)">
        <g transform={`translate(${x1}, ${y1})`}>
          <polygon
            transform={`translate(${BLUR_OFFSET - 34}, ${-BLUR_OFFSET - 110})`}
            points="0 0 0 108 108 108 108 216 216 216 216 0 0 0"
          />
        </g>
        <rect
          x={x2}
          y={y2}
          width="144"
          height="144"
          transform={`translate(${BLUR_OFFSET + 72}, ${-BLUR_OFFSET - 144})`}
        />
      </g>
    </svg>
  );
};

export default Shadow;
