/**
 * Projectile rendering overlay.
 *
 * Renders animated projectiles as an SVG overlay without mutating the underlying
 * fluxel grid. This keeps projectile visuals decoupled from the grid renderers
 * (SVG/Canvas/Pixi) while staying aligned to the same cell sizing.
 */
import clsx from "clsx";

import styles from "./ProjectilesOverlay.module.scss";
import type { Projectile } from "./useFluxelProjectiles";

// Intentionally high-contrast colors for quick direction recognition.
// If/when this overlay needs to match a design system palette, migrate these
// to CSS custom properties (or shared theme tokens) instead of hard-coded values.
const directionColor: Record<Projectile["direction"], string> = {
  up: "yellow",
  down: "#87ad26",
  left: "#660099",
  right: "orange",
};

export interface ProjectilesOverlayProps {
  projectiles: Projectile[];
  fluxelSize: number;
  rows: number;
  cols: number;
  className?: string;
}

/**
 * Lightweight SVG overlay that renders projectiles without touching the fluxel grid.
 * Positioned absolutely over the grid container; expects the same aspect/size.
 */
export function ProjectilesOverlay({
  projectiles,
  fluxelSize,
  rows,
  cols,
  className,
}: ProjectilesOverlayProps) {
  if (fluxelSize <= 0 || rows <= 0 || cols <= 0) return null;

  const width = cols * fluxelSize;
  const height = rows * fluxelSize;

  return (
    <div className={clsx(styles.overlay, className)} aria-hidden="true">
      <svg
        className={styles.svg}
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height="100%"
      >
        {projectiles.map((proj) => (
          <rect
            key={proj.id}
            className={styles.projectile}
            x={proj.col * fluxelSize}
            y={proj.row * fluxelSize}
            width={fluxelSize}
            height={fluxelSize}
            fill={directionColor[proj.direction]}
            opacity={0.95}
          />
        ))}
      </svg>
    </div>
  );
}

export default ProjectilesOverlay;
