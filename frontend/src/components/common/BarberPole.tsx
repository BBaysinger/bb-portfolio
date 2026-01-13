import clsx from "clsx";
import React from "react";

/**
 * Animated barber-pole indicator.
 *
 * Responsibilities:
 * - Renders a simple striped element whose animation is controlled by CSS.
 * - Optionally allows callers to pause/resume animation via the `paused` prop.
 *
 * Key exports:
 * - Default export `BarberPole`.
 */

import styles from "./BarberPole.module.scss";

/**
 * Props for `BarberPole`.
 *
 * Notes:
 * - `paused` only applies an inline `animation-play-state` override when provided.
 * - Prefer controlling animation via CSS from the parent when possible.
 */
type BarberPoleProps = React.HTMLAttributes<HTMLDivElement> & {
  className?: string;
  /**
   * When set, pauses/resumes the stripe animation.
   * Omit to let CSS control animation state.
   */
  paused?: boolean;
};

/**
 * Renders the barber-pole stripes.
 *
 * @param props - Component props.
 */
const BarberPole: React.FC<BarberPoleProps> = ({
  className = "",
  paused,
  ...rest
}) => {
  return (
    <div className={clsx(styles.barberPole, className)} {...rest}>
      <div
        className={clsx(styles.stripes, "stripes")}
        style={
          paused !== undefined
            ? { animationPlayState: paused ? "paused" : "running" }
            : undefined
        }
      />
    </div>
  );
};

export default BarberPole;
