import React from "react";

import Shadow from "./Shadow";
import styles from "./Fluxel.module.scss";

export interface FluxelData {
  id: string;
  row: number;
  col: number;
  neighbors: FluxelData[];
  influence: number;
}

/**
 * Fluxing Pixel
 *
 * @author Bradley Baysinger
 * @since The beginning of time.
 * @version N/A
 */
const Fluxel: React.FC<{
  data: FluxelData;
  _debug?: boolean | string | number | object | null;
}> = ({ data }) => {
  const transformStyle = {
    backgroundColor: `rgba(0, 0, 0, ${data.influence * 0.5 - 0.1})`,
  };

  const x1 = data.neighbors[4]
    ? Math.round(Math.min(data.neighbors[4].influence - data.influence, 0) * 60)
    : 0;
  const y1 = data.neighbors[1]
    ? Math.round(Math.max(data.influence - data.neighbors[1].influence, 0) * 60)
    : 0;

  return (
    <div className={`${styles["fluxel"]}`} style={transformStyle}>
      <Shadow className={styles["shadow"]} x1={x1} y1={y1} />
      {/* {true && (
        <div className={styles["debug"]}>{data?.neighbors[4]?.influence}</div>
      )} */}
    </div>
  );
};

export default Fluxel;
