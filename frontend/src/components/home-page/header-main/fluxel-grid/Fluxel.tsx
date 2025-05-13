import React from "react";

import cornerShadow from "images/hero/corner-shadow.webp";
import styles from "./Fluxel.module.scss";

export interface FluxelData {
  id: string;
  row: number;
  col: number;
  influence: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
  colorVariation?: string;
}

/**
 * Fluxing Pixel
 *
 * A square on the grid that can simulate depth and have color variations
 * applied to it.
 *
 * @author Bradley Baysinger
 * @since The beginning of time.
 * @version N/A
 */
const Fluxel: React.FC<{ data: FluxelData }> = ({ data }) => {
  const transformStyle = {
    "--base-color": `rgba(20, 20, 20, ${data.influence * 1.0 - 0.1})`,
    "--overlay-color": data.colorVariation,
  } as React.CSSProperties;

  return (
    <svg
      className={styles.fluxel}
      style={transformStyle}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 72 72"
    >
      {/* Shadow group */}
      <g opacity="0.5">
        <g
          transform={`translate(${data.shadowOffsetX}, ${data.shadowOffsetY})`}
        >
          <image
            href={cornerShadow}
            x={-34}
            y={-110}
            width="216"
            height="216"
          />
        </g>
        {/* <g
          transform={`scale(-1, -1) translate(${data.shadowOffsetX}, ${data.shadowOffsetY})`}
        >
          <image
            href={cornerShadow}
            x={-34}
            y={-110}
            width="216"
            height="216"
          />
        </g> */}

        {/* Overlay colorVariation fill */}
      </g>
      <rect width="72" height="72" fill="var(--overlay-color)" />
    </svg>
  );
};

function areEqual(prev: { data: FluxelData }, next: { data: FluxelData }) {
  const a = prev.data;
  const b = next.data;
  return (
    a.influence === b.influence &&
    a.shadowOffsetX === b.shadowOffsetX &&
    a.shadowOffsetY === b.shadowOffsetY &&
    a.colorVariation === b.colorVariation
  );
}

export default React.memo(Fluxel, areEqual);
