import React, { useEffect, useRef, useState } from "react";
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
  const [fluxelSize, setFluxelSize] = useState<number>(0); // Dynamically track size

  const gridRef = useRef<HTMLDivElement>(null); // Reference to the grid container

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

  // Dynamically update Fluxel size
  useEffect(() => {
    const updateFluxelSize = () => {
      if (gridRef.current) {
        const rect = gridRef.current.getBoundingClientRect();
        setFluxelSize(rect.width / cols); // Calculate size dynamically
      }
    };

    updateFluxelSize();
    window.addEventListener("resize", updateFluxelSize);
    return () => window.removeEventListener("resize", updateFluxelSize);
  }, [cols]);

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
      if (!gridRef.current) return;

      const rect = gridRef.current.getBoundingClientRect();
      const localX = event.clientX - rect.left;
      const localY = event.clientY - rect.top;

      setMousePos({ x: localX, y: localY });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Apply mouse influence effect
  useEffect(() => {
    if (!mousePos || fluxelSize === 0) return;

    setGrid((prevGrid) => {
      return prevGrid.map((row, rowIndex) => {
        return row.map((square, colIndex) => {
          const gridX = colIndex * fluxelSize + fluxelSize / 2;
          const gridY = rowIndex * fluxelSize + fluxelSize / 2;

          const dx = gridX - mousePos.x;
          const dy = gridY - mousePos.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          const maxRadius = fluxelSize * 5; // Influence radius scales with size
          let strength =
            Math.exp(-distance * 0.01) * (distance < maxRadius ? 1 : 0);
          strength = Math.round(strength * 100) / 100; // ✅ Round influence

          // Compute directional influence vector
          let influenceVector =
            distance === 0
              ? { x: 0, y: 0 }
              : {
                  x: (dx / distance) * strength * fluxelSize * 0.7,
                  y: (dy / distance) * strength * fluxelSize * 0.7,
                };

          // ✅ Round influence vector values
          influenceVector.x = Math.round(influenceVector.x * 100) / 100;
          influenceVector.y = Math.round(influenceVector.y * 100) / 100;

          return {
            ...square,
            influence: strength, // Store rounded influence
            mouseEffect: influenceVector, // Store rounded movement direction
          };
        });
      });
    });
  }, [mousePos, fluxelSize, rows, cols]);

  return (
    <div
      ref={gridRef} // Attach ref to the grid container
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
