import React, { useEffect, useState } from "react";
import styles from "./BorderBlinker.module.scss";

export type Side = "top" | "right" | "bottom" | "left";
export type SideNull = Side | null;

interface BorderBlinkerProps {
  highlightSide: SideNull;
}

/**
 * Border Blinker
 *
 * Flashes individual borders per side without mitered corners.
 *
 * @author Bradley Baysinger
 * @since The beginning of time.
 * @version N/A
 */
const BorderBlinker: React.FC<BorderBlinkerProps> = ({ highlightSide }) => {
  const [flashKey, setFlashKey] = useState(0);

  useEffect(() => {
    if (highlightSide) {
      setFlashKey((k) => k + 1);
    }
  }, [highlightSide]);

  return (
    <div className={styles.borderBlinker}>
      {["top", "right", "bottom", "left"].map((side) => (
        <div
          key={`${flashKey}-${side}`}
          className={`${styles.borderSide} ${
            highlightSide === side ? styles[`blink-${side}`] : ""
          } ${styles[side as Side]}`}
        />
      ))}
    </div>
  );
};

export default BorderBlinker;
