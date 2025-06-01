import React from "react";

import SlingerRay from "./SlingerRay";
import useScopedImagePreload from "hooks/useScopedImagePreload";
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
  // Fixes issue with image data not staying decoded on mobile.
  useScopedImagePreload("/spritesheets/energy-bars_w92h300f110.webp");

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
