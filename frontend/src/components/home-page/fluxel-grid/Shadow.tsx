import React from "react";

import styles from "./Shadow.module.scss";

interface ShadowProps {
  className?: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

const Shadow: React.FC<ShadowProps> = ({ className, x1, y1, x2, y2 }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1in"
      height="1in"
      viewBox="0 0 72 72"
      className={`${styles["shadow"]} ${className}`}
    >
      <g>
        <polygon
          transform={`scale(3, 3) translate(${x1}, ${y1})`}
          points="0 0 0 48 24 48 24 72 72 72 72 0 0 0"
        />
        <rect x={x2} y={y2} width="72" height="72" />
      </g>
    </svg>
  );
};

export default Shadow;
