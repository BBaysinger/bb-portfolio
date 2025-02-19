import React, { useEffect, useRef, useState } from "react";
import Fluxel, { FluxelData } from "./Fluxel";
import styles from "./FluxelGrid.module.scss";

const DEBUG = false;

const FluxelGrid: React.FC<{ rows: number; cols: number }> = ({
  rows,
  cols,
}) => {
  const [grid, setGrid] = useState<FluxelData[][]>([]);
  const [time, setTime] = useState<number>(0);
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
        depth: Math.sin((row + col) * 0.1), // ✅ Initialize depth immediately
        influence: 0,
        mouseEffect: { x: 0, y: 0 },
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

    // Wave oscillation effect
    const interval = setInterval(() => {
      setTime((prevTime) => prevTime + 0.1);
    }, 100);

    return () => clearInterval(interval);
  }, [rows, cols]);

  // ✅ Mutable Depth Update (instead of replacing state)
  useEffect(() => {
    setGrid((prevGrid) => {
      prevGrid.forEach((row) => {
        row.forEach((fluxel) => {
          fluxel.depth =
            Math.round(
              Math.sin((fluxel.row + fluxel.col + time) * 0.1) * 1000,
            ) / 1000;
        });
      });
      return [...prevGrid]; // Force re-render by returning a new reference
    });
  }, [time]);

  useEffect(() => {
    const updateFluxelSize = () => {
      if (gridRef.current) {
        setFluxelSize(gridRef.current.getBoundingClientRect().width / cols);
      }
    };
    updateFluxelSize();
    window.addEventListener("resize", updateFluxelSize);
    return () => window.removeEventListener("resize", updateFluxelSize);
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
          const maxRadius = fluxelSize * 5;
          let strength =
            Math.exp(-distance * 0.01) * (distance < maxRadius ? 1 : 0);
          strength = Math.round(strength * 100) / 100;

          let influenceVector =
            distance === 0
              ? { x: 0, y: 0 }
              : {
                  x:
                    Math.round(
                      (dx / distance) * strength * fluxelSize * 0.7 * 100,
                    ) / 100,
                  y:
                    Math.round(
                      (dy / distance) * strength * fluxelSize * 0.7 * 100,
                    ) / 100,
                };

          square.influence = strength;
          square.mouseEffect = influenceVector;
        });
      });
      return [...prevGrid]; // Force re-render by returning a new reference
    });
  }, [mousePos, fluxelSize]);

  return (
    <div
      ref={gridRef}
      className={styles["fluxel-grid"]}
      style={{ "--cols": cols } as React.CSSProperties}
    >
      {grid.flat().map((square) => (
        <Fluxel key={square.id} data={square} />
      ))}
    </div>
  );
};

export default FluxelGrid;
