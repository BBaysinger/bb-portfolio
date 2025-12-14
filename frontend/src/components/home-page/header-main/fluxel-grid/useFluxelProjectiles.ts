import React, { useEffect, useRef, useState } from "react";

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
 * They animate in double speed in dev mode due to strict mode. I tried to
 * prevent that, but I'll need to come back to it later.
 *
 * @param param0
 * @returns
 */
export function useFluxelProjectiles({
  gridRef,
  intervalMs = 25,
}: {
  gridRef: React.RefObject<FluxelGridHandle | null>;
  intervalMs?: number;
}): UseFluxelProjectilesReturn {
  const projectilesRef = useRef<Projectile[]>([]);
  const [projectiles, setProjectiles] = useState<Projectile[]>([]);
  const intervalRef = useRef<number | null>(null);

  const startInterval = () => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current); // kill any zombie interval
      intervalRef.current = null;
    }

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
        clearInterval(intervalRef.current!);
        intervalRef.current = null;
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
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  return [projectiles, launchProjectile];
}

export default useFluxelProjectiles;
