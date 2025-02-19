import React, { useEffect, useState } from "react";
import Fluxel, { FluxelData } from "./Fluxel";
import styles from "./FluxelGrid.module.scss";

const DEBUG = false;

const FluxelGrid: React.FC<{ rows: number; cols: number }> = ({
  rows,
  cols,
}) => {
  const [grid, setGrid] = useState<FluxelData[][]>([]);
  const [time, setTime] = useState<number>(0); // Used to control wave oscillation
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(
    null,
  );

  useEffect(() => {
    // Initialize grid
    const newGrid: FluxelData[][] = [];

    for (let row = 0; row < rows; row++) {
      newGrid[row] = [];
      for (let col = 0; col < cols; col++) {
        newGrid[row][col] = {
          id: `${row}-${col}`,
          row,
          col,
          neighbors: [],
          debug: DEBUG,
          depth: 0, // Initialize depth for each square
          influence: 0, // New influence property
          mouseEffect: { x: 0, y: 0 }, // Vector for directional movement
        };
      }
    }

    // Assign neighbors
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const neighbors: FluxelData[] = [];
        const directions = [
          [-1, -1], // Top-left
          [-1, 0], // Top,
          [-1, 1], // Top-right
          [0, -1], // Left,
          [0, 1], // Right
          [1, -1], // Bottom-left,
          [1, 0], // Bottom,
          [1, 1], // Bottom-right
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

    // Set up wave oscillation effect
    const interval = setInterval(() => {
      setTime((prevTime) => prevTime + 0.1); // Increment time for wave
    }, 100);

    return () => clearInterval(interval); // Clean up on component unmount
  }, [rows, cols]);

  // Update depth for each square based on wave function
  useEffect(() => {
    setGrid((prevGrid) =>
      prevGrid.map((row) =>
        row.map((square) => ({
          ...square,
          depth: Math.sin((square.row + square.col + time) * 0.1), // Apply sine wave for depth
        })),
      ),
    );
  }, [time, rows, cols]);

  // Track mouse movement
  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      setMousePos({ x: event.clientX, y: event.clientY });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Apply mouse influence effect
  useEffect(() => {
    if (!mousePos) return;

    setGrid((prevGrid) => {
      console.log("asf");
      return prevGrid.map((row, rowIndex) => {
        return row.map((square, colIndex) => {
          const gridX = colIndex * 30 + 15; // Assuming each cell is 30px wide
          const gridY = rowIndex * 30 + 15;

          const dx = gridX - mousePos.x;
          const dy = gridY - mousePos.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          const maxRadius = 150; // Influence radius
          const strength =
            Math.exp(-distance * 0.01) * (distance < maxRadius ? 1 : 0); // Exponential falloff

          // Compute directional influence vector
          const influenceVector =
            distance === 0
              ? { x: 0, y: 0 }
              : {
                  x: (dx / distance) * strength * 20, // Move away from cursor
                  y: (dy / distance) * strength * 20,
                };

          return {
            ...square,
            influence: strength, // Store influence separately
            mouseEffect: influenceVector, // Store movement direction
          };
        });
      });
    });
  }, [mousePos, rows, cols]);

  return (
    <div
      className={`${styles["fluxel-grid"]}`}
      style={{ "--cols": cols } as React.CSSProperties}
    >
      {grid.flat().map((square) => (
        <Fluxel key={square.id} data={square} />
      ))}
    </div>
  );
};

export default FluxelGrid;
