import React from "react";

import Shadow from "./Shadow";
import styles from "./Fluxel.module.scss";

export interface FluxelData {
  id: string;
  row: number;
  col: number;
  neighbors: FluxelData[];
  debug: boolean | string | number | object | null;
  depth: number;
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
  animation?: string | undefined;
  gridSize: number;
}> = ({ data }) => {
  const transformStyle = {
    // "--fluxel-row": data.row, // CSS variable for row
    // "--fluxel-col": data.col, // CSS variable for col
    // "--fluxel-gridSize": gridSize + "px", // CSS variable for col
    backgroundColor: `rgba(0, 0, 0, ${data.influence * 0.4 - 0.1})`,
  };

  const x1 = data.neighbors[4]
    ? Math.min(data.neighbors[4].influence - data.influence, 0) * 60
    : 0;
  const y1 = data.neighbors[1]
    ? Math.max(data.influence - data.neighbors[1].influence, 0) * 60
    : 0;
  //   const x2 = data.neighbors[2]
  //   ? (data.influence - data.neighbors[2].influence) * 10
  //   : 0;
  // const y2 = data.neighbors[2]
  //   ? (data.neighbors[2].influence - data.influence) * 10
  //   : 0;
  // const x2 = 0;
  // const y2 = 0;

  return (
    <div className={`${styles["fluxel"]}`} style={transformStyle}>
      <Shadow className={styles["shadow"]} x1={x1} y1={y1} />
      {/* <Shadow className={styles["shadow"]} x1={x1} y1={y1} x2={x2} y2={y2} /> */}
      {data.debug && (
        <div className={styles["debug"]}>
          {/* {data.neighbors[4] && <>{data.neighbors[4].influence}</>},{" "}
          {data.row}, {data.col} */}
          {data.depth}
        </div>
      )}
    </div>
  );
};

export default Fluxel;
