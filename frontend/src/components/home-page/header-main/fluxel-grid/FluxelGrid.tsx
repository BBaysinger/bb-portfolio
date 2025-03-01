import React, { useEffect, useRef, useState } from "react";
import Fluxel, { FluxelData } from "./Fluxel";
import PixelAnim from "./AnimationSequencer";
import styles from "./FluxelGrid.module.scss";

const smoothStep = (edge0: number, edge1: number, x: number) => {
  let t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

const FluxelGrid: React.FC<{
  rows: number;
  cols: number;
  viewableHeight: number;
  viewableWidth: number;
  externalMousePos?: { x: number; y: number } | null;
}> = ({ rows, cols, viewableHeight, viewableWidth, externalMousePos }) => {
  const [grid, setGrid] = useState<FluxelData[][]>(
    Array.from({ length: rows }, (_, row) =>
      Array.from({ length: cols }, (_, col) => ({
        id: `${row}-${col}`,
        row,
        col,
        influence: 0,
        x1: 0,
        y1: 0,
      }))
    )
  );
  const [fluxelSize, setFluxelSize] = useState(0);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(
    null
  );

  const gridRef = useRef<HTMLDivElement>(null);
  const lastFrameTime = useRef(0);

  useEffect(() => {
    const updateSizes = () => {
      if (gridRef.current) {
        setFluxelSize(gridRef.current.clientWidth / cols);
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

      const { left, top } = gridRef.current.getBoundingClientRect();
      setMousePos({ x: event.clientX - left, y: event.clientY - top });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const getShadowInfluence = (
    { col, row }: { col: number; row: number },
    { x, y }: { x: number; y: number }
  ) => {
    const gridX = col * fluxelSize + fluxelSize / 2;
    const gridY = row * fluxelSize + fluxelSize / 2;
    const dx = gridX - x;
    const dy = gridY - y;
    const baseDistance = Math.sqrt(dx * dx + dy * dy);
    const influence = 1 - smoothStep(0, fluxelSize * 4, baseDistance);
    return baseDistance < fluxelSize * 4 ? influence : 0;
  };

  useEffect(() => {
    if (!gridRef.current || !fluxelSize) return;
    const effectiveMousePos = externalMousePos || mousePos || { x: 0, y: 0 };

    requestAnimationFrame(() => {
      setGrid((prevGrid) => {
        let hasChanged = false;

        const updatedGrid = prevGrid.map((row, rowIndex) =>
          row.map((fluxel, colIndex) => {
            const influence = getShadowInfluence(
              { col: colIndex, row: rowIndex },
              effectiveMousePos
            );
            const topInfluence = getShadowInfluence(
              { col: colIndex, row: rowIndex - 1 },
              effectiveMousePos
            );
            const rightInfluence = getShadowInfluence(
              { col: colIndex + 1, row: rowIndex },
              effectiveMousePos
            );

            const x1 = Math.round(Math.min(rightInfluence - influence, 0) * 60);
            const y1 = Math.round(Math.max(influence - topInfluence, 0) * 60);

            if (
              Math.abs(influence - fluxel.influence) > 0.009 ||
              x1 !== fluxel.x1 ||
              y1 !== fluxel.y1
            ) {
              hasChanged = true;
              return { ...fluxel, influence: +influence.toFixed(2), x1, y1 };
            }
            return fluxel;
          })
        );

        return hasChanged ? updatedGrid : prevGrid;
      });
    });
  }, [mousePos, externalMousePos, fluxelSize]);

  /** 
   * **Determine Which Fluxels Are Visible**  
   * Uses `viewableHeight` and `viewableWidth` to hide overflow rows/columns.
   */
  let viewableRows = rows,
    viewableCols = cols,
    rowOverlap = 0,
    colOverlap = 0;

  if (gridRef.current) {
    viewableRows = Math.ceil(viewableHeight / (gridRef.current.offsetHeight / rows));
    viewableCols = Math.ceil(viewableWidth / (gridRef.current.offsetWidth / cols));
    rowOverlap = Math.floor((rows - viewableRows) / 2);
    colOverlap = Math.floor((cols - viewableCols) / 2);
  }

  return (
    <div
      ref={gridRef}
      className={styles["fluxel-grid"]}
      style={{ "--cols": cols } as React.CSSProperties}
    >
      <PixelAnim className={styles["fluxel-grid-background"]} />
      {grid.flat().map((data) => {
        const isVisible =
          data.col >= colOverlap &&
          data.col < cols - colOverlap &&
          data.row >= rowOverlap &&
          data.row < rows - rowOverlap;

        return isVisible ? (
          <Fluxel key={data.id} data={data} />
        ) : (
          <div key={data.id} className={styles["inactive-placeholder"]}></div>
        );
      })}
    </div>
  );
};

export default FluxelGrid;
