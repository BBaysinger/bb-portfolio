import React from "react";

import styles from "./BarberPole.module.scss";

/**
 * Only applies the play/pause inline style when explicitly set.
 * Using CSS in parent module is preferred.
 *
 * @author Bradley Baysinger
 * @since The beginning of time.
 * @version N/A
 */
const BarberPole: React.FC<{ className: string; paused?: boolean }> = ({
  className,
  paused,
}) => {
  return (
    <div className={`${styles.barberPole} ${className}`}>
      <div
        className={`${styles.stripes} stripes`}
        style={
          paused !== undefined
            ? { animationPlayState: paused ? "paused" : "running" }
            : undefined
        }
      ></div>
    </div>
  );
};

export default BarberPole;
