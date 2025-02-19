import React from "react";

import styles from "./Fluxel.module.scss";

// Square type definition
export interface FluxelData {
  id: string;
  row: number;
  col: number;
  neighbors: FluxelData[];
  debug: boolean | string | number | object | null;
}

// Square component
const Fluxel: React.FC<{ data: FluxelData }> = ({ data }) => {
  return (
    <div className={`${styles["fluxel"]}`} key={data.id}>
      {data.debug && (
        <>
          {data.row},{data.col}
        </>
      )}
    </div>
  );
};

export default Fluxel;
