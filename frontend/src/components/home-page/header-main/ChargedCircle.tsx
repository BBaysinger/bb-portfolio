import React from "react";

import SlingerRay from "./SlingerRay";
import useScopedImagePreload from "@/hooks/useScopedImagePreload";
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
  useScopedImagePreload("/spritesheets/lightning_Layer-Comp-_w480h1098f7.webp");

  return (
    <div
      className={styles.chargedCircle}
      style={{ display: isActive ? "unset" : "none" }}
    >
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
