import React from "react";

import styles from "./Shadow.module.scss";

interface ShadowProps {
  className?: string;
}

const Shadow: React.FC<ShadowProps> = ({ className }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1in"
      height="1in"
      viewBox="0 0 72 72"
      className={`${styles["shadow"]} ${className}`}
    >
      <defs>
        <filter id="blur">
          <feGaussianBlur stdDeviation="5" />
        </filter>
      </defs>

      <g filter="url(#blur)">
        <rect x="50%" y="-50%" width="72" height="72" />
        <polygon
          x="50%"
          y="-50%"
          points="0 0 0 48 24 48 24 72 72 72 72 0 0 0"
        />
      </g>
    </svg>
  );
};

export default Shadow;
