import React from "react";
import Shadow from "./Shadow";
import styles from "./Fluxel.module.scss";

export interface FluxelData {
  id: string;
  row: number;
  col: number;
  influence: number;
  x1: number;
  y1: number;
}

/**
 * Fluxing Pixel
 */
const Fluxel: React.FC<{ data: FluxelData }> = ({ data }) => {
  const transformStyle = {
    backgroundColor: `rgba(0, 0, 0, ${data.influence * 0.5 - 0.1})`,
  };

  return (
    <div className={styles["fluxel"]} style={transformStyle}>
      <Shadow className={styles["shadow"]} x1={data.x1} y1={data.y1} />
      {/* <div className={styles["debug"]}>{data.influence}</div> */}
    </div>
  );
};

export default Fluxel;
