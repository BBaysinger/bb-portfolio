import React from "react";
import styles from "./Fluxel.module.scss";

// Square type definition
export interface FluxelData {
  id: string;
  row: number;
  col: number;
  neighbors: FluxelData[];
  debug: boolean | string | number | object | null;
  depth: number; // Added depth property
}

// Square component
const Fluxel: React.FC<{ data: FluxelData }> = ({ data }) => {
  // Apply depth as a translate or scale effect
  const transformStyle = {
    transform: `translateY(${data.depth * 50}px)`, // Example: Oscillate up/down by 50px
  };

  return (
    <div className={`${styles["fluxel"]}`} style={transformStyle}>
      {data.debug && (
        <>
          {data.row},{data.col}
        </>
      )}
    </div>
  );
};

export default Fluxel;
