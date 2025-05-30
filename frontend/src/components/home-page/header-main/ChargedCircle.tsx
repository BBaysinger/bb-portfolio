import React from "react";

import SlingerRay from "./SlingerRay";
import styles from "./ChargedCircle.module.scss";

interface ChargedCircleProps {
  isActive?: boolean;
}

/**
 * ChargedCircle Component
 *
 * @component
 */
const ChargedCircle: React.FC<ChargedCircleProps> = ({ isActive = false }) => {
  return (
    <div className={styles.chargedCircle}>
      <div className={styles.scaler}>
        <SlingerRay
          className={[styles.bolt, styles.bolt1].join(" ")}
          isActive={isActive}
        />
        <SlingerRay
          className={[styles.bolt, styles.bolt2].join(" ")}
          isActive={isActive}
        />
        <SlingerRay
          className={[styles.bolt, styles.bolt3].join(" ")}
          isActive={isActive}
        />
      </div>
    </div>
  );
};

export default React.memo(ChargedCircle);
