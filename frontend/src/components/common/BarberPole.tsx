import React from "react";

import styles from "./BarberPole.module.scss";

/**
 * Only applies the play/pause inline style when explicitly set.
 * Using CSS in parent module is preferred.
 *
 */
type BarberPoleProps = React.HTMLAttributes<HTMLDivElement> & {
  className?: string;
  paused?: boolean;
};

const BarberPole: React.FC<BarberPoleProps> = ({
  className = "",
  paused,
  ...rest
}) => {
  return (
    <div className={`${styles.barberPole} ${className}`} {...rest}>
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
