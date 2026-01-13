/**
 * Decorative “grab the orb” tooltip.
 *
 * Rendered inside the hero slinger/orb as an onboarding hint.
 * The parent controls visibility (e.g., hides permanently after first collision).
 *
 * This component is intentionally non-interactive and should not be announced by
 * assistive tech.
 */

import clsx from "clsx";

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
function OrbGrabTooltip({ className, hidden = false }: Props) {
  if (hidden) {
    // Avoid rendering any DOM when hidden to keep the orb subtree minimal.
    return null;
  }

  return (
    <div className={clsx(styles.orbGrabTooltip, "orbGrabTooltip", className)}>
      {/* Inline SVG so stroke follows currentColor and supports CSS drop-shadow */}
      <svg
        viewBox="0 0 71.96 72"
        className={styles.grabImage}
        aria-hidden="true"
        focusable="false"
        preserveAspectRatio="xMidYMid meet"
      >
        <polygon
          points="55.89 61.31 59.31 64.72 53.32 70.71 70.7 70.74 70.68 53.35 64.69 59.34 61.28 55.92 64.99 52.2 14.59 1.78 1.78 14.59 52.18 65.02 55.89 61.31"
          fill="none"
          stroke="currentColor"
          strokeMiterlimit={9.91}
          strokeWidth={2.52}
        />
      </svg>
      <div className={styles.tooltipText} />
    </div>
  );
}

export default OrbGrabTooltip;
