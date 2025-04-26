import React from "react";
import Shadow from "./Shadow";
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
    "--base-color": `rgba(0, 0, 0, ${data.influence * 0.5 - 0.1})`,
    "--overlay-color": data.colorVariation,
  } as React.CSSProperties;

  return (
    <div className={styles.fluxel} style={transformStyle}>
      <Shadow
        className={styles.shadow}
        x1={data.shadowOffsetX}
        y1={data.shadowOffsetY}
      />
      {/* <div className={styles.debug}>{JSON.stringify(data)}</div> */}
    </div>
  );
};

export default Fluxel;
