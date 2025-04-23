import React, { useEffect, useRef } from "react";
import { FluxelData } from "./Fluxel";
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
  intervalMs = 50,
}: {
  gridRef: React.RefObject<FluxelGridHandle | null>;
  setGridData: React.Dispatch<React.SetStateAction<FluxelData[][]>>;
  intervalMs?: number;
}): LaunchFn {
  const projectiles = useRef<Projectile[]>([]);
  const intervalRef = useRef<number | null>(null);
  const lastKnownGrid = useRef<FluxelData[][]>([]); // store the grid for animation

  const startInterval = () => {
    if (intervalRef.current !== null) return; // already running

    intervalRef.current = window.setInterval(() => {
      const prevGrid = lastKnownGrid.current;
      if (
        projectiles.current.length === 0 ||
        prevGrid.length === 0 ||
        prevGrid[0].length === 0
      ) {
        clearInterval(intervalRef.current!);
        intervalRef.current = null;
        return;
      }

      const updatedGrid = prevGrid.map((row) =>
        row.map((fluxel) => ({ ...fluxel, colorVariation: "transparent" })),
      );

      const newProjectiles: Projectile[] = [];

      for (const proj of projectiles.current) {
        const { row, col, direction, id } = proj;

        let newRow = row;
        let newCol = col;

        switch (direction) {
          case "up":
            newRow -= 1;
            break;
          case "down":
            newRow += 1;
            break;
          case "left":
            newCol -= 1;
            break;
          case "right":
            newCol += 1;
            break;
        }

        const inBounds =
          newRow >= 0 &&
          newRow < prevGrid.length &&
          newCol >= 0 &&
          newCol < prevGrid[0].length;

        if (inBounds) {
          updatedGrid[newRow][newCol] = {
            ...updatedGrid[newRow][newCol],
            colorVariation: "rgba(255, 0, 0, 1)",
          };
          newProjectiles.push({ id, row: newRow, col: newCol, direction });
        }
      }

      projectiles.current = newProjectiles;
      lastKnownGrid.current = updatedGrid;
      setGridData(updatedGrid);
    }, intervalMs);
  };

  const launchProjectile: LaunchFn = (x, y, direction) => {
    const fluxel = gridRef.current?.getFluxelAt(x, y);
    if (!fluxel) {
      console.warn("No fluxel found at", x, y);
      return;
    }

    const { row, col } = fluxel;
    const id = crypto.randomUUID();
    projectiles.current.push({ id, row, col, direction });

    startInterval();
  };

  // Cleanup on unmount
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
