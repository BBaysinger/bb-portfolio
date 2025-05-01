import React, { useEffect, useState } from "react";
import styles from "./BorderBlinker.module.scss";

export type Side = "top" | "right" | "bottom" | "left";

interface BorderBlinkerProps {
  highlightSides: Side[] | null;
  className?: string;
}

/**
 * Border Blinker
 *
 * Flashes individual borders per side.
 * Just flashes based on highlightSides passed from parent.
 */
const BorderBlinker: React.FC<BorderBlinkerProps> = ({
  highlightSides,
  className,
}) => {
  const [activeSides, setActiveSides] = useState<Side[]>([]);

  useEffect(() => {
    if (!highlightSides) return;
    setActiveSides(highlightSides);
  }, [highlightSides?.join(",")]);

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
