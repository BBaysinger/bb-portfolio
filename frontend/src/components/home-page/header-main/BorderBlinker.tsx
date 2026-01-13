/**
 * Renders animated “blinking” border segments on selected sides.
 *
 * This component is purely decorative: it exposes no interactive UI and should
 * not be announced by assistive tech.
 *
 * Key exports:
 * - `Side`: allowed border sides.
 * - `BorderBlinker`: renders one absolutely-positioned segment per active side.
 */

import clsx from "clsx";

import styles from "./BorderBlinker.module.scss";

export type Side = "top" | "right" | "bottom" | "left";

interface BorderBlinkerProps {
  blinkSides?: readonly Side[] | null;
  className?: string;
}

function BorderBlinker({ blinkSides, className }: BorderBlinkerProps) {
  const activeSides = blinkSides ?? [];

  return (
    <div aria-hidden="true" className={clsx(styles.borderBlinker, className)}>
      {activeSides.map((side, index) => (
        <div
          key={`${side}-${index}`} // allow for repeated sides if necessary
          className={clsx(
            styles.borderSide,
            styles[side],
            styles[`blink-${side}`],
          )}
          // Deterministic stacking so multiple sides can overlap predictably.
          style={{ zIndex: index }}
        />
      ))}
    </div>
  );
}

export default BorderBlinker;
