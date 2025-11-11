import clsx from "clsx";
import React from "react";

import useScopedImagePreload from "@/hooks/useScopedImagePreload";

import styles from "./ChargedCircle.module.scss";
import SlingerRay from "./SlingerRay";

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
      <div className={styles.chargedCircleCenter}>
        <div className={styles.chargedCircleRotator}>
          <div className={styles.scaler}>
            <SlingerRay
              className={clsx(styles.bolt, styles.bolt1)}
              isActive={isActive}
            />
            <SlingerRay
              className={clsx(styles.bolt, styles.bolt2)}
              isActive={isActive}
            />
            <SlingerRay
              className={clsx(styles.bolt, styles.bolt3)}
              isActive={isActive}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(ChargedCircle);
