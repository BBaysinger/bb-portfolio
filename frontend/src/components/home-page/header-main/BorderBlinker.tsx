import React, { useEffect, useState } from "react";

import styles from "./BorderBlinker.module.scss";

export type Side = "top" | "right" | "bottom" | "left";

interface BorderBlinkerProps {
  blinkSides: Side[] | null;
  className?: string;
}

/**
 * Border Blinker
 *
 * Flashes individual borders per side.
 * Just flashes based on blinkSides passed from parent.
 */
const BorderBlinker: React.FC<BorderBlinkerProps> = ({
  blinkSides,
  className,
}) => {
  const [activeSides, setActiveSides] = useState<Side[]>([]);

  useEffect(() => {
    if (!blinkSides) return;
    setActiveSides(blinkSides);
  }, [blinkSides]);

  return (
    <div className={`${className} ${styles.borderBlinker}`}>
      {activeSides.map((side, index) => (
        <div
          key={`${side}-${index}`} // allow for repeated sides if necessary
          className={`${styles.borderSide} ${styles[side]} ${styles[`blink-${side}`]}`}
          style={{ zIndex: index }}
        />
      ))}
    </div>
  );
};

export default BorderBlinker;
