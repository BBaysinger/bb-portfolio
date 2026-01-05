import clsx from "clsx";
import React from "react";

import styles from "./ChargedCircle.module.scss";
import SlingerRay from "./SlingerRay";

interface ChargedCircleProps {
  isActive?: boolean;
  isUnlocked?: boolean;
}

/**
 * ChargedCircle Component
 *
 * A circle of rays centered on the orb, to give a 'fidget spinner' effect when
 * the orb is being dragged.
 *
 * @component
 */
const ChargedCircle: React.FC<ChargedCircleProps> = ({
  isActive = false,
  isUnlocked = false,
}) => {
  const isVisible = isActive && isUnlocked;

  return (
    <div
      className={styles.chargedCircle}
      style={{ display: isVisible ? "unset" : "none" }}
    >
      <div className={styles.chargedCircleCenter}>
        <div className={styles.chargedCircleRotator}>
          <div className={styles.scaler}>
            <SlingerRay
              className={clsx(styles.bolt, styles.bolt1)}
              isActive={isVisible}
            />
            <SlingerRay
              className={clsx(styles.bolt, styles.bolt2)}
              isActive={isVisible}
            />
            <SlingerRay
              className={clsx(styles.bolt, styles.bolt3)}
              isActive={isVisible}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(ChargedCircle);
