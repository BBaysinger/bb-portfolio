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
  mouseEffect: { x: number; y: number };
}

const Fluxel: React.FC<{ data: FluxelData }> = ({ data }) => {
  const transformStyle = {
    // transform: `translate(${data.mouseEffect.x}px, ${data.mouseEffect.y + data.depth * 50}px)`,
  };

  const x1 = data.neighbors[4]
    ? Math.min((data.neighbors[4].influence - data.influence) * 10, 0)
    : 0;
  const y1 = data.neighbors[1]
    ? Math.max(data.influence - data.neighbors[1].influence, 0) * 10
    : 0;
  const x2 = 0;
  const y2 = 0;

  return (
    <div className={`${styles["fluxel"]}`} style={transformStyle}>
      <Shadow className={styles["shadow"]} x1={x1} y1={y1} x2={x2} y2={y2} />
      {data.debug && (
        <div className={styles["debug"]}>
          {data.neighbors[4] && <>{data.neighbors[4].influence}</>},
          {/* ,{data.row},{data.col} */}
        </div>
      )}
    </div>
  );
};

export default Fluxel;
