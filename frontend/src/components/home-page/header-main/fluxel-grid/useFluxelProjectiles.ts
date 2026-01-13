/**
 * Projectile simulation for fluxel grids.
 *
 * Maintains a small list of moving “projectiles” (grid-aligned squares) and
 * advances them on a fixed interval. This is intentionally decoupled from the
 * grid renderer (SVG/Canvas/Pixi) so visuals can be layered independently.
 */

import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";

import MiscUtils from "@/utils/MiscUtils";

import type { FluxelGridHandle } from "./FluxelAllTypes";

export type Direction = "up" | "down" | "left" | "right";

export interface Projectile {
  id: string;
  row: number;
  col: number;
  direction: Direction;
}

type LaunchFn = (x: number, y: number, direction: Direction) => void;

type UseFluxelProjectilesReturn = [Projectile[], LaunchFn];

/**
 * Animates squares (projectiles) moving in a given direction across the grid.
 *
 * Note: React Strict Mode in development can make timing issues more noticeable.
 * If you see “double speed” behavior, confirm the caller isn't launching twice
 * (effects run twice in dev) before changing animation timing.
 *
 * @param options - Hook options.
 * @param options.gridRef - Fluxel grid handle used to locate fluxels + read grid dimensions.
 * @param options.intervalMs - Simulation step interval in ms.
 * @returns A tuple of `[projectiles, launchProjectile]`.
 */
export function useFluxelProjectiles({
  gridRef,
  intervalMs = 25,
}: {
  gridRef: RefObject<FluxelGridHandle | null>;
  intervalMs?: number;
}): UseFluxelProjectilesReturn {
  const projectilesRef = useRef<Projectile[]>([]);
  const [projectiles, setProjectiles] = useState<Projectile[]>([]);
  const intervalRef = useRef<number | null>(null);

  const stopInterval = () => {
    if (intervalRef.current === null) return;
    window.clearInterval(intervalRef.current);
    intervalRef.current = null;
  };

  const startInterval = () => {
    if (typeof window === "undefined") return;

    // Reset the timer so we only ever have one active tick loop.
    stopInterval();

    const tickFunction = () => {
      const snapshot = gridRef.current?.getGridData();
      const rowCount = snapshot?.length ?? 0;
      const colCount = snapshot?.[0]?.length ?? 0;

      if (
        !snapshot ||
        projectilesRef.current.length === 0 ||
        rowCount === 0 ||
        colCount === 0
      ) {
        // Nothing to simulate (grid not ready / unmounted / no projectiles).
        stopInterval();
        projectilesRef.current = [];
        setProjectiles([]);
        return;
      }

      const stillFlying: Projectile[] = [];

      for (const proj of projectilesRef.current) {
        let { row, col } = proj;
        const { id, direction } = proj;

        switch (direction) {
          case "up":
            row -= 1;
            break;
          case "down":
            row += 1;
            break;
          case "left":
            col -= 1;
            break;
          case "right":
            col += 1;
            break;
        }

        const inBounds =
          row >= 0 && row < rowCount && col >= 0 && col < colCount;

        if (inBounds) {
          stillFlying.push({ id, row, col, direction });
        }
      }

      projectilesRef.current = stillFlying;
      setProjectiles(stillFlying);
    };

    intervalRef.current = window.setInterval(tickFunction, intervalMs);
  };

  const launchProjectile: LaunchFn = (x, y, direction) => {
    const fluxel = gridRef.current?.getFluxelAt(x, y);
    if (!fluxel) {
      return;
    }

    const { row, col } = fluxel;
    const id = MiscUtils.safeUUID();

    projectilesRef.current = [
      ...projectilesRef.current,
      { id, row, col, direction },
    ];
    setProjectiles(projectilesRef.current);

    startInterval();
  };

  useEffect(() => {
    return () => {
      stopInterval();
    };
  }, []);

  return [projectiles, launchProjectile];
}

export default useFluxelProjectiles;
