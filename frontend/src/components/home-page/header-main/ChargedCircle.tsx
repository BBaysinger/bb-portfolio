import React, { useEffect } from "react";

import Ray from "./Ray";
import styles from "./ChargedCircle.module.scss";

interface ChargedCircleProps {
  paused?: boolean;
}

/**
 * ChargedCircle Component
 *
 * @component
 */
const ChargedCircle: React.FC<ChargedCircleProps> = ({ paused = true }) => {
  return (
    <div className={styles.chargedCircle}>
      <div className={styles.scaler}>
        <Ray
          className={[styles.bolt, styles.bolt1].join(" ")}
          paused={paused}
        />
        <Ray
          className={[styles.bolt, styles.bolt2].join(" ")}
          paused={paused}
        />
        <Ray
          className={[styles.bolt, styles.bolt3].join(" ")}
          paused={paused}
        />
      </div>
    </div>
  );
};

export default ChargedCircle;
