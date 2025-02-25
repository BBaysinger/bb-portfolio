import React, { useEffect, useRef, useState } from "react";

import Fluxel, { FluxelData } from "./Fluxel";
import PixelAnim from "./PixelAnim";
import styles from "./FluxelGrid.module.scss";

const DEBUG = false;

/**
 * Fluxing Pixel Grid
 *
 * Makes a grid of giant pixels that can be interacted with.
 * Here I've added simulated shadows for depth with mouse move effect and
 * I mapped animated images to the grid for a unique experience.
 * Built in React since that's my current focus, but I need to rebuild it in
 * PixiJS with WebGL, for performance with other onscreen animations.
 *
 * @author Bradley Baysinger
 * @since The beginning of time.
 * @version N/A
 */
const FluxelGrid: React.FC<{
  rows: number;
  cols: number;
  viewableHeight: number;
  viewableWidth: number;
}> = ({ rows, cols, viewableHeight, viewableWidth }) => {
  const [grid, setGrid] = useState<FluxelData[][]>([]);
  const [fluxelSize, setFluxelSize] = useState<number>(0);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(
    null,
  );

  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialize grid
    const newGrid: FluxelData[][] = Array.from({ length: rows }, (_, row) =>
      Array.from({ length: cols }, (_, col) => ({
        id: `${row}-${col}`,
        row,
        col,
        neighbors: [],
        debug: DEBUG,
        depth: Math.sin((row + col) * 0.1),
        influence: 0,
      })),
    );

    // Assign neighbors
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const neighbors: FluxelData[] = [];
        const directions = [
          [-1, -1], // TL
          [-1, 0], // T,
          [-1, 1], // TR
          [0, -1], // L,
          [0, 1], // R
          [1, -1], // BL,
          [1, 0], // B,
          [1, 1], // BR
        ];

        directions.forEach(([dRow, dCol]) => {
          const nRow = row + dRow;
          const nCol = col + dCol;
          if (nRow >= 0 && nRow < rows && nCol >= 0 && nCol < cols) {
            neighbors.push(newGrid[nRow][nCol]);
          }
        });

        newGrid[row][col].neighbors = neighbors;
      }
    }

    setGrid(newGrid);
  }, [rows, cols]);

  useEffect(() => {
    const updateSizes = () => {
      if (gridRef.current) {
        const size = gridRef.current.getBoundingClientRect().width;
        setFluxelSize(size / cols);
      }
    };
    updateSizes();
    window.addEventListener("resize", updateSizes);
    return () => window.removeEventListener("resize", updateSizes);
  }, [cols]);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!gridRef.current) return;
      const rect = gridRef.current.getBoundingClientRect();
      setMousePos({
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  function smoothstep(edge0: number, edge1: number, x: number) {
    let t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
  }

  useEffect(() => {
    if (!mousePos || fluxelSize === 0) return;

    setGrid((prevGrid) => {
      prevGrid.forEach((row, rowIndex) => {
        row.forEach((square, colIndex) => {
          const gridX = colIndex * fluxelSize + fluxelSize / 2;
          const gridY = rowIndex * fluxelSize + fluxelSize / 2;
          const dx = gridX - mousePos.x;
          const dy = gridY - mousePos.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const maxRadius = fluxelSize * 4;
          let strength =
            (1 - smoothstep(0, maxRadius, distance)) *
            (distance < maxRadius ? 1 : 0);
          strength = Math.round(strength * 100) / 100;

          square.influence = strength;
        });
      });
      return [...prevGrid];
    });
  }, [mousePos, fluxelSize]);

  let viewableRows = 0;
  let viewableCols = 0;

  if (gridRef.current?.offsetWidth) {
    viewableRows = Math.ceil(
      viewableHeight / (gridRef.current?.offsetHeight / rows),
    );
    viewableCols = Math.ceil(
      viewableWidth / (gridRef.current?.offsetWidth / cols),
    );
  }
  const rowOverlap = Math.floor((rows - viewableRows) / 2);
  const colOverlap = Math.floor((rows - viewableCols) / 2);

  return (
    <div
      ref={gridRef}
      className={`${styles["fluxel-grid"]}`}
      style={{ "--cols": cols } as React.CSSProperties}
    >
      <PixelAnim className={`${styles["fluxel-grid-background"]}`}></PixelAnim>
      {grid.flat().map((data) => {
        const isVisible =
          data.col >= colOverlap &&
          data.col < cols - colOverlap &&
          data.row >= rowOverlap &&
          data.row < rows - rowOverlap;

        if (!isVisible) {
          return (
            <div key={data.id} className={styles["inactive-placeholder"]}>
              {/* {colOverlap} */}
            </div>
          );
        } else {
          return (
            <Fluxel
              key={data.id}
              data={data}
              // debug={viewableHeight}
            />
          );
        }
      })}
    </div>
  );
};

export default FluxelGrid;
