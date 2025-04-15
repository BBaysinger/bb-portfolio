import React, { useEffect, useRef, useState } from "react";
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
 * Supports multiple simultaneous side highlights.
 */
const BorderBlinker: React.FC<BorderBlinkerProps> = ({ highlightSide }) => {
  const [activeSides, setActiveSides] = useState<Set<Side>>(new Set());
  const timersRef = useRef<
    Partial<Record<Side, ReturnType<typeof setTimeout>>>
  >({});

  useEffect(() => {
    if (highlightSide) {
      // Add the new side to the set
      setActiveSides((prev) => new Set(prev).add(highlightSide));

      // Clear any existing timer to restart the animation
      if (timersRef.current[highlightSide]) {
        clearTimeout(timersRef.current[highlightSide]);
      }

      // Set a timer to remove the side after the animation ends
      timersRef.current[highlightSide] = setTimeout(() => {
        setActiveSides((prev) => {
          const next = new Set(prev);
          next.delete(highlightSide);
          return next;
        });
      }, 300); // match CSS animation duration
    }
  }, [highlightSide]);

  return (
    <div className={styles.borderBlinker}>
      {(["top", "right", "bottom", "left"] as Side[]).map((side) => (
        <div
          key={side}
          className={`${styles.borderSide} ${styles[side]} ${
            activeSides.has(side) ? styles[`blink-${side}`] : ""
          }`}
        />
      ))}
    </div>
  );
};

export default BorderBlinker;
