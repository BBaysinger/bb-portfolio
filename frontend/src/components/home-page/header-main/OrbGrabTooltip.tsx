/**
 * Decorative “grab the orb” tooltip.
 *
 * Rendered inside the hero slinger/orb as an onboarding hint.
 * The parent renders it only after persisted onboarding eligibility is known.
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
 * Visibility policy remains in the parent so this component stays presentational.
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
