import React from "react";

import styles from "./Fluxel.module.scss";

// Square type definition
export interface FluxelData {
  id: string;
  row: number;
  col: number;
  neighbors: FluxelData[];
}

// Square component
const Fluxel: React.FC<{ data: FluxelData }> = ({ data }) => {
  return (
    <div
      className={`${styles["fluxel"]}`}
      key={data.id}
      style={{
        width: "50px",
        height: "50px",
        border: "1px solid black",
        display: "inline-block",
        background: "#ddd",
        textAlign: "center",
        lineHeight: "50px",
      }}
    >
      {data.row},{data.col}
    </div>
  );
};

export default Fluxel;
