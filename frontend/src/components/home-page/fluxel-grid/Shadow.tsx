import React from "react";
import { FluxelData } from "./Fluxel";
import styles from "./Shadow.module.scss";

interface ShadowProps {
  className?: string;
  neighbors: FluxelData[];
}

const Shadow: React.FC<ShadowProps> = ({ className, neighbors }) => {
  const x = neighbors[2] ? Math.min(neighbors[2].depth * 10, 0) : 0;
  const y = neighbors[4] ? Math.max(neighbors[4].depth * 10, 0) : 0;

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
          <feGaussianBlur stdDeviation="2" />
        </filter>
      </defs>

      <g filter="url(#blur)">
        {neighbors.length > 4 && (
          <polygon
            transform={`scale(3, 3) translate(${x}, ${y})`}
            points="0 0 0 48 24 48 24 72 72 72 72 0 0 0"
          />
        )}
      </g>
    </svg>
  );
};

export default Shadow;
