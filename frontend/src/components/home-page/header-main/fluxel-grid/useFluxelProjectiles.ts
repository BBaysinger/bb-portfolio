import { useEffect, useRef } from "react";
import MiscUtils from "utils/MiscUtils";
import type { FluxelData } from "./Fluxel";
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

  const startInterval = () => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
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
          const { row, col, direction, id } = proj;

          // Draw at current position
          if (
            row >= 0 &&
            row < nextGrid.length &&
            col >= 0 &&
            col < nextGrid[0].length
          ) {
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
          }

          // Calculate next position
          let newRow = row;
          let newCol = col;

          switch (direction) {
            case "up":
              newRow--;
              break;
            case "down":
              newRow++;
              break;
            case "left":
              newCol--;
              break;
            case "right":
              newCol++;
              break;
          }

          const inBounds =
            newRow >= 0 &&
            newRow < nextGrid.length &&
            newCol >= 0 &&
            newCol < nextGrid[0].length;

          if (inBounds) {
            stillFlying.push({ id, row: newRow, col: newCol, direction });
          }
        }

        projectiles.current = stillFlying;

        // Stop interval if no projectiles are left
        if (stillFlying.length === 0) {
          // Let one more tick happen to clear visuals
          setTimeout(() => {
            if (intervalRef.current !== null) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
          }, intervalMs);
        }

        return nextGrid;
      });
    }, intervalMs);
  };

  const launchProjectile: LaunchFn = (x, y, direction) => {
    const fluxel = gridRef.current?.getFluxelAt(x, y);
    if (!fluxel) return;

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
