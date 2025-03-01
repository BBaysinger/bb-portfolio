import React, { useEffect, useRef, useState } from "react";
import Fluxel, { FluxelData } from "./Fluxel";
import PixelAnim from "./AnimationSequencer";
import styles from "./FluxelGrid.module.scss";

const DEBUG = false;

function smoothStep(edge0: number, edge1: number, x: number) {
  let t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

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
          x1: 0,
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

  const getShadowOffsets = (
    fluxelPos: { col: number; row: number },
    effectiveMousePos: { x: number; y: number },
  ) => {
    const gridX = fluxelPos.col * fluxelSize + fluxelSize / 2;
    const gridY = fluxelPos.row * fluxelSize + fluxelSize / 2;

    // **Calculate Distance Once**
    const dx = gridX - effectiveMousePos.x;
    const dy = gridY - effectiveMousePos.y;
    const baseDistance = Math.sqrt(dx * dx + dy * dy);
    const maxRadius = fluxelSize * 4;

    const influence =
      (1 - smoothStep(0, maxRadius, baseDistance)) *
      (baseDistance < maxRadius ? 1 : 0);

    return influence;
  };

  // Influence & Shadow Offset Calculation (without referencing actual neighbors)
  useEffect(() => {
    if (!gridRef.current || fluxelSize === 0) return;

    const effectiveMousePos = externalMousePos || mousePos || { x: 0, y: 0 };
    if (!effectiveMousePos) return;

    requestAnimationFrame(() => {
      setGrid((prevGrid) => {
        let hasChanged = false;

        const updatedGrid = prevGrid.map((row, rowIndex) =>
          row.map((fluxel, colIndex) => {
            const newInfluenceData = getShadowOffsets(
              { col: colIndex, row: rowIndex },
              effectiveMousePos,
            );

            const topFluxelInfluence = getShadowOffsets(
              { col: colIndex, row: rowIndex - 1 },
              { x: effectiveMousePos.x, y: effectiveMousePos.y },
            );

            const rightFluxelInfluence = getShadowOffsets(
              { col: colIndex + 1, row: rowIndex },
              { x: effectiveMousePos.x, y: effectiveMousePos.y },
            );

            const x1 = Math.round(
              Math.min(rightFluxelInfluence - newInfluenceData, 0) * 60,
            );
            const y1 = Math.round(
              Math.max(newInfluenceData - topFluxelInfluence, 0) * 60,
            );

            // **Only update if values actually changed**
            if (
              Math.abs(newInfluenceData - fluxel.influence) > 0.009 ||
              x1 !== fluxel.x1 ||
              y1 !== fluxel.y1
            ) {
              hasChanged = true;
              return {
                ...fluxel,
                influence: Math.round(newInfluenceData * 100) / 100,
                x1: x1,
                y1: y1,
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
