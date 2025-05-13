import React, { useEffect, useRef } from "react";

import { FluxelData } from "./Fluxel";
import MiscUtils from "utils/MiscUtils";
import type { FluxelGridHandle } from "./FluxelGrid";

export type Direction = "up" | "down" | "left" | "right";

interface Projectile {
  id: string;
  row: number;
  col: number;
  direction: Direction;
}

type LaunchFn = (x: number, y: number, direction: Direction) => void;

/**
 * Animates squares (projectiles) moving in a given direction across the grid.
 *
 * (They animate in double speed in dev mode due to strict mode. I tried to
 * prevent that, but I'll need to come back to it later.)
 *
 * @param param0
 * @returns
 */
export function useFluxelProjectiles({
  gridRef,
  setGridData,
  intervalMs = 25,
}: {
  gridRef: React.RefObject<FluxelGridHandle | null>;
  setGridData: React.Dispatch<React.SetStateAction<FluxelData[][]>>;
  intervalMs?: number;
}): LaunchFn {
  const projectiles = useRef<Projectile[]>([]);
  const intervalRef = useRef<number | null>(null);
  const gridNeedsFinalClear = useRef(false);

  // const isDev = process.env.NODE_ENV !== "production";
  // const devGuard = useRef(0);

  const startInterval = () => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current); // kill any zombie interval
      intervalRef.current = null;
    }

    intervalRef.current = window.setInterval(() => {
      const snapshot = gridRef.current?.getGridData();

      if (!snapshot || snapshot.length === 0 || snapshot[0].length === 0) {
        clearInterval(intervalRef.current!);
        intervalRef.current = null;
        return;
      }

      setGridData((prevGrid) => {
        const nextGrid = prevGrid.map((row) =>
          row.map((fluxel) => ({ ...fluxel, colorVariation: "transparent" })),
        );

        const stillFlying: Projectile[] = [];

        for (const proj of projectiles.current) {
          let { row, col, direction, id } = proj;

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
            row >= 0 &&
            row < nextGrid.length &&
            col >= 0 &&
            col < nextGrid[0].length;

          if (!inBounds) {
            console.log(`Projectile ${id} exited the grid.`);
            continue;
          }

          const color =
            direction === "up"
              ? "yellow"
              : direction === "down"
                ? "#87ad26"
                : direction === "left"
                  ? "#660099"
                  : "orange";

          nextGrid[row][col] = {
            ...nextGrid[row][col],
            colorVariation: color,
          };

          stillFlying.push({ id, row, col, direction });
        }

        projectiles.current = stillFlying;

        if (stillFlying.length === 0) {
          if (!gridNeedsFinalClear.current) {
            gridNeedsFinalClear.current = true;
          } else {
            clearInterval(intervalRef.current!);
            setTimeout(() => {}, intervalMs);
            intervalRef.current = null;
            gridNeedsFinalClear.current = false;
          }
        }

        return nextGrid;
      });
    }, intervalMs);

    const tickProjectiles = () => {
      const snapshot = gridRef.current?.getGridData();

      if (!snapshot || snapshot.length === 0 || snapshot[0].length === 0) {
        return;
      }

      setGridData((prevGrid) => {
        const nextGrid = prevGrid.map((row) =>
          row.map((fluxel) => ({ ...fluxel, colorVariation: "transparent" })),
        );

        const stillFlying: Projectile[] = [];

        for (const proj of projectiles.current) {
          let { row, col, direction, id } = proj;

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
            row >= 0 &&
            row < nextGrid.length &&
            col >= 0 &&
            col < nextGrid[0].length;

          if (!inBounds) {
            console.log(`Projectile ${id} exited the grid.`);
            continue;
          }

          const color =
            direction === "up"
              ? "yellow"
              : direction === "down"
                ? "#87ad26"
                : direction === "left"
                  ? "#660099"
                  : "orange";

          nextGrid[row][col] = {
            ...nextGrid[row][col],
            colorVariation: color,
          };

          stillFlying.push({ id, row, col, direction });
        }

        projectiles.current = stillFlying;

        if (stillFlying.length === 0) {
          if (!gridNeedsFinalClear.current) {
            gridNeedsFinalClear.current = true;
          } else {
            clearInterval(intervalRef.current!);
            intervalRef.current = null;
            gridNeedsFinalClear.current = false;

            // ⏱️ Final clear pass after unmount interval (delayed by one tick)
            setTimeout(tickProjectiles, intervalMs);
          }
        }

        return nextGrid;
      });
    };

    intervalRef.current = window.setInterval(() => {
      tickProjectiles();
    }, intervalMs);
  };

  const launchProjectile: LaunchFn = (x, y, direction) => {
    const fluxel = gridRef.current?.getFluxelAt(x, y);
    if (!fluxel) {
      return;
    }

    const { row, col } = fluxel;
    const id = MiscUtils.safeUUID();

    projectiles.current.push({ id, row, col, direction });

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

  return launchProjectile;
}

export default useFluxelProjectiles;
