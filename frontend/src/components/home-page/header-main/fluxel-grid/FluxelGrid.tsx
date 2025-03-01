import React, { useEffect, useRef, useState } from "react";
import Fluxel, { FluxelData } from "./Fluxel";
import PixelAnim from "./AnimationSequencer";
import styles from "./FluxelGrid.module.scss";

const DEBUG = false;

const FluxelGrid: React.FC<{
  rows: number;
  cols: number;
  viewableHeight: number;
  viewableWidth: number;
  externalMousePos?: { x: number; y: number } | null | undefined;
}> = ({ rows, cols, viewableHeight, viewableWidth, externalMousePos }) => {
  const [grid, setGrid] = useState<FluxelData[][]>([]);
  const [fluxelSize, setFluxelSize] = useState<number>(0);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(
    null,
  );

  const gridRef = useRef<HTMLDivElement>(null);
  const lastFrameTime = useRef(0);

  useEffect(() => {
    // Initialize grid
    setGrid(
      Array.from({ length: rows }, (_, row) =>
        Array.from({ length: cols }, (_, col) => ({
          id: `${row}-${col}`,
          row,
          col,
          influence: 0,
          x1: 0, // Shadow offsets
          y1: 0,
        })),
      ),
    );
  }, [rows, cols]);

  useEffect(() => {
    const updateSizes = () => {
      if (gridRef.current) {
        setFluxelSize(gridRef.current.getBoundingClientRect().width / cols);
      }
    };

    updateSizes();
    window.addEventListener("resize", updateSizes);
    window.addEventListener("orientationchange", updateSizes);
    return () => {
      window.removeEventListener("resize", updateSizes);
      window.removeEventListener("orientationchange", updateSizes);
    };
  }, [cols]);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!gridRef.current) return;
      const now = performance.now();
      if (now - lastFrameTime.current < 1000 / 30) return;

      lastFrameTime.current = now;
      const rect = gridRef.current.getBoundingClientRect();
      setMousePos({
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Influence & Shadow Offset Calculation
  useEffect(() => {
    if (!gridRef.current || fluxelSize === 0) return;

    const effectiveMousePos = externalMousePos || mousePos || { x: 0, y: 0 };
    if (!effectiveMousePos) return;

    requestAnimationFrame(() => {
      setGrid((prevGrid) => {
        let hasChanged = false;

        const updatedGrid = prevGrid.map((row, rowIndex) =>
          row.map((fluxel, colIndex) => {
            const gridX = colIndex * fluxelSize + fluxelSize / 2;
            const gridY = rowIndex * fluxelSize + fluxelSize / 2;

            const dx = gridX - effectiveMousePos.x;
            const dy = gridY - effectiveMousePos.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const maxRadius = fluxelSize * 4;

            // Influence strength (0 to 1)
            const newInfluence =
              (1 - Math.min(1, Math.max(0, (distance - 0) / (maxRadius - 0)))) *
              (distance < maxRadius ? 1 : 0);
            const roundedInfluence = Math.round(newInfluence * 100) / 100;

            // Shadow offsets (based on mouse movement direction)
            const newX1 = Math.round(dx / 10);
            const newY1 = Math.round(dy / 10);

            // **Only update if values actually changed**
            if (
              Math.abs(roundedInfluence - fluxel.influence) > 0.01 ||
              newX1 !== fluxel.x1 ||
              newY1 !== fluxel.y1
            ) {
              hasChanged = true;
              return {
                ...fluxel,
                influence: roundedInfluence,
                x1: newX1,
                y1: newY1,
              };
            }

            return fluxel;
          }),
        );

        return hasChanged ? updatedGrid : prevGrid;
      });
    });
  }, [mousePos, externalMousePos, fluxelSize]);

  return (
    <div
      ref={gridRef}
      className={styles["fluxel-grid"]}
      style={{ "--cols": cols } as React.CSSProperties}
    >
      <PixelAnim className={styles["fluxel-grid-background"]} />
      {grid.flat().map((data) => (
        <Fluxel key={data.id} data={data} />
      ))}
    </div>
  );
};

export default FluxelGrid;
