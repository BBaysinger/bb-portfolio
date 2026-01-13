/**
 * Decorative “charged” ring rendered around the orb.
 *
 * Used on the home page header to create a fidget-spinner style visual when the
 * orb is draggable and actively being interacted with.
 *
 * This component is intentionally non-interactive and should not be announced
 * by assistive tech.
 */

import clsx from "clsx";
import { memo } from "react";

import styles from "./ChargedCircle.module.scss";
import SlingerRay from "./SlingerRay";

interface ChargedCircleProps {
  isActive?: boolean;
  isUnlocked?: boolean;
}

function ChargedCircle({
  isActive = false,
  isUnlocked = false,
}: ChargedCircleProps) {
  const isVisible = isActive && isUnlocked;

  return (
    <div
      aria-hidden="true"
      className={styles.chargedCircle}
      // Keep the DOM mounted but non-rendering to avoid layout impact.
      // `undefined` removes the inline style entirely when visible.
      style={{ display: isVisible ? undefined : "none" }}
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
}

export default memo(ChargedCircle);
