import React, { useEffect, useRef } from "react";
import { FluxelData } from "./Fluxel";

type Direction = "up" | "down" | "left" | "right";

interface Projectile {
  id: string;
  row: number;
  col: number;
  direction: Direction;
}

type LaunchFn = (
  startRow: number,
  startCol: number,
  direction: Direction,
) => void;

export function useFluxelProjectiles({
  grid,
  setGrid,
  intervalMs = 50,
}: {
  grid: FluxelData[][];
  setGrid: React.Dispatch<React.SetStateAction<FluxelData[][]>>;
  intervalMs?: number;
}): LaunchFn {
  const projectiles = useRef<Projectile[]>([]);
  const intervalRef = useRef<number | null>(null);
  const gridRef = useRef<FluxelData[][]>([]);

  // Keep the gridRef in sync with the latest grid
  useEffect(() => {
    gridRef.current = grid;
  }, [grid]);

  const launchProjectile: LaunchFn = (startRow, startCol, direction) => {
    const id = crypto.randomUUID();
    projectiles.current.push({ id, row: startRow, col: startCol, direction });
  };

  useEffect(() => {
    intervalRef.current = window.setInterval(() => {
      const prevGrid = gridRef.current;
      // console.log(
      //   "prevGrid",
      //   projectiles.current.length,
      //   prevGrid[0],
      //   prevGrid.length,
      // );
      if (projectiles.current.length === 0 || prevGrid.length === 0) return;

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
      setGrid(updatedGrid);
    }, intervalMs);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [intervalMs, setGrid]);

  return launchProjectile;
}

export default useFluxelProjectiles;
