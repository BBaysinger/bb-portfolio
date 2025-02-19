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

  return (
    <div className={`${styles["fluxel"]}`} style={transformStyle}>
      <Shadow className={styles["shadow"]} neighbors={data.neighbors} />
      {data.debug && (
        <div className={styles["debug"]}>
          {data.neighbors[2] && <>{data.neighbors[2].depth}</>},
          {data.neighbors[4] && <>{data.neighbors[4].depth}</>},
          {/* ,{data.row},{data.col} */}
        </div>
      )}
    </div>
  );
};

export default Fluxel;
