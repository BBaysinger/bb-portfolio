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

import SpriteSheetPlayer from "@/components/common/sprite-rendering/SpriteSheetPlayer";

import styles from "./OrbGrabTooltip.module.scss";

const grabTooltipSrc = "/spritesheets/hero/grab-tooltip_w160h160f86.webp";

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
    <div
      className={clsx(styles.orbGrabTooltip, "orbGrabTooltip", className)}
      aria-hidden="true"
    >
      <SpriteSheetPlayer
        className={styles.grabImage}
        src={grabTooltipSrc}
        autoPlay={true}
        fps={50}
        loops={0}
      />
    </div>
  );
}

export default OrbGrabTooltip;
