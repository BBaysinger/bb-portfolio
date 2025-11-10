import clsx from "clsx";
import React from "react";

import styles from "./OrbGrabTooltip.module.scss";

type Props = {
  className?: string;
  hidden?: boolean;
};

/**
 * Arrow tooltip that appears on the draggable orb to guide first-time users.
 * Hides permanently after the first wall collision to avoid clutter for experienced users.
 *
 */
const OrbGrabTooltip: React.FC<Props> = ({
  className = "",
  hidden = false,
}) => {
  if (hidden) {
    return null;
  }

  return (
    <div className={clsx(`${styles.orbGrabTooltip} orbGrabTooltip`, className)}>
      <div className={styles.tooltipText} />
    </div>
  );
};

export default OrbGrabTooltip;
