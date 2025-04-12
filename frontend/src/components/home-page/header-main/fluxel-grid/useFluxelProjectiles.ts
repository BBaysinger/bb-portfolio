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
  setGrid,
  intervalMs = 50,
}: {
  setGrid: React.Dispatch<React.SetStateAction<FluxelData[][]>>;
  intervalMs?: number;
}): LaunchFn {
  const projectiles = useRef<Projectile[]>([]);
  const intervalRef = useRef<number | null>(null);

  const launchProjectile: LaunchFn = (startRow, startCol, direction) => {
    const id = crypto.randomUUID();
    projectiles.current.push({ id, row: startRow, col: startCol, direction });
  };

  useEffect(() => {
    intervalRef.current = window.setInterval(() => {
      if (projectiles.current.length === 0) return;

      setGrid((prevGrid) => {
        const updatedGrid = prevGrid.map((row) =>
          row.map((fluxel) => ({ ...fluxel, colorVariation: 0 })),
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
              colorVariation: 1, // You can animate this further over time
            };
            newProjectiles.push({ id, row: newRow, col: newCol, direction });
          }
        }

        projectiles.current = newProjectiles;
        return updatedGrid;
      });
    }, intervalMs);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [setGrid]);

  return launchProjectile;
}

export default useFluxelProjectiles;
