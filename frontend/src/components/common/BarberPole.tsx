import React from "react";

import styles from "./BarberPole.module.scss";

/**
 * @author Bradley Baysinger
 * @since The beginning of time.
 * @version N/A
 */
const BarberPole: React.FC<{ className: string; paused?: boolean }> = ({
  className,
  paused = false,
}) => {
  return (
    <div className={`${styles.barberPole} ${className}`}>
      <div
        className={`${styles.stripes} stripes`}
        style={{ animationPlayState: paused ? "paused" : "running" }}
      ></div>
    </div>
  );
};

export default BarberPole;
