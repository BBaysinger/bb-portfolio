import React from "react";

import Shadow from "./Shadow";
import styles from "./Fluxel.module.scss";

// Square type definition
export interface FluxelData {
  id: string;
  row: number;
  col: number;
  neighbors: FluxelData[];
  debug: boolean | string | number | object | null;
  depth: number; // Depth property for wave oscillation
  influence: number; // Influence property from mouse movement
  mouseEffect: { x: number; y: number }; // Vector for directional displacement
}

// Square component
const Fluxel: React.FC<{ data: FluxelData }> = ({ data }) => {
  // Combine effects
  const transformStyle = {
    // transform: `translate(${data.mouseEffect.x}px, ${data.mouseEffect.y + data.depth * 50}px)`,
  };

  data.debug = true;

  // const x = neighbors[1] ? Math.min((neighbors[1].depth + neighbors[1].influence) * 10, 0) : 0;
  // const y = neighbors[4] ? Math.max((neighbors[4].depth + neighbors[4].influence) * 10, 0) : 0;
  // const x = neighbors[1] ? -Math.max(( neighbors[1].influence) * 10, 0) : 0;
  // const y = 0;
  const x = data.neighbors[4]
    ? data.influence - data.neighbors[4].influence * 10
    : 0;
  const y = -10;

  return (
    <div className={`${styles["fluxel"]}`} style={transformStyle}>
      <Shadow className={styles["shadow"]} x1={x} y1={y} x2={x} y2={y} />
      {true && (
        <div className={styles["debug"]}>
          {data.neighbors[4] && <>{data.neighbors[4].influence}</>},
          {/* ,{data.row},{data.col} */}
        </div>
      )}
    </div>
  );
};

export default Fluxel;
