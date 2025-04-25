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
  // const isDev = process.env.NODE_ENV !== "production";
  // const devGuard = useRef(0);

  const startInterval = () => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current); // kill any zombie interval
      intervalRef.current = null;
    }

    intervalRef.current = window.setInterval(() => {
      // if (isDev) {
      //   devGuard.current++;
      //   console.log("[DEV] Interval tick", devGuard.current);
      //   if (devGuard.current % 2 === 0) {
      //     console.log("[DEV] Skipping duplicate setState");
      //     return;
      //   }
      // }

      const snapshot = gridRef.current?.getGridData();
      if (
        !snapshot ||
        projectiles.current.length === 0 ||
        snapshot.length === 0 ||
        snapshot[0].length === 0
      ) {
        clearInterval(intervalRef.current!);
        intervalRef.current = null;
        return;
      }

      setGridData((prevGrid) => {
        if (
          projectiles.current.length === 0 ||
          prevGrid.length === 0 ||
          prevGrid[0].length === 0
        ) {
          return prevGrid;
        }

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

          if (inBounds) {
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
        }

        projectiles.current = stillFlying;
        return nextGrid;
      });
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
