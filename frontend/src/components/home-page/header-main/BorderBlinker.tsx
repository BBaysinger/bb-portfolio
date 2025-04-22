import React, { useEffect, useRef, useState } from "react";
import styles from "./BorderBlinker.module.scss";

export type Side = "top" | "right" | "bottom" | "left";

interface BorderBlinkerProps {
  highlightSide: Side | null;
}

/**
 * Border Blinker
 *
 * Flashes individual borders per side without mitered corners.
 * Supports multiple simultaneous side highlights.
 */
const BorderBlinker: React.FC<BorderBlinkerProps> = ({ highlightSide }) => {
  const [activeSides, setActiveSides] = useState<Side[]>([]);
  const timersRef = useRef<
    Partial<Record<Side, ReturnType<typeof setTimeout>>>
  >({});

  useEffect(() => {
    if (highlightSide) {
      // Add the new side to the set
      setActiveSides((prev) => {
        const without = prev.filter((s) => s !== highlightSide); // remove if already exists
        return [...without, highlightSide]; // re-add at the end
      });

      // Clear any existing timer to restart the animation
      if (timersRef.current[highlightSide]) {
        clearTimeout(timersRef.current[highlightSide]);
      }

      // Set a timer to remove the side after the animation ends
      timersRef.current[highlightSide] = setTimeout(() => {
        setActiveSides((prev) => prev.filter((s) => s !== highlightSide));
      }, 300);
    }
  }, [highlightSide]);

  return (
    <div className={styles.borderBlinker}>
      {activeSides.map((side, index) => (
        <div
          key={side}
          className={`${styles.borderSide} ${styles[side]} ${styles[`blink-${side}`]}`}
          style={{ zIndex: index }} // newer = higher
        />
      ))}
    </div>
  );
};

export default BorderBlinker;
