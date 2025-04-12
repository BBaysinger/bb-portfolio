import React, { useEffect, useRef, useState } from "react";
import Fluxel, { FluxelData } from "./Fluxel";
import PixelAnim from "./AnimationSequencer";
import { useFluxelShadows } from "./useFluxelShadows";
import styles from "./FluxelGrid.module.scss";

const FluxelGrid: React.FC<{
  rows: number;
  cols: number;
  viewableHeight: number;
  viewableWidth: number;
  externalMousePos?: { x: number; y: number } | null;
  setGrid: React.Dispatch<React.SetStateAction<FluxelData[][]>>;
}> = ({ rows, cols, viewableHeight, viewableWidth, externalMousePos }) => {
  const [grid, setGrid] = useState<FluxelData[][]>(
    Array.from({ length: rows }, (_, row) =>
      Array.from({ length: cols }, (_, col) => ({
        id: `${row}-${col}`,
        row,
        col,
        influence: 0,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
      })),
    ),
  );
  const [fluxelSize, setFluxelSize] = useState(0);
  const gridRef = useRef<HTMLDivElement>(null);

  // TODO: Move to Hero.
  useFluxelShadows({
    gridRef,
    fluxelSize,
    setGrid,
    externalMousePos,
    viewableWidth,
    viewableHeight,
  });

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

  /**
   * Determine Which Fluxels Are Visible
   * Uses `viewableHeight` and `viewableWidth` to hide overflow rows/columns.
   */
  let viewableRows = rows,
    viewableCols = cols,
    rowOverlap = 0,
    colOverlap = 0;

  if (gridRef.current) {
    viewableRows = Math.ceil(
      viewableHeight / (gridRef.current.offsetHeight / rows),
    );
    viewableCols = Math.ceil(
      viewableWidth / (gridRef.current.offsetWidth / cols),
    );
    rowOverlap = Math.floor((rows - viewableRows) / 2);
    colOverlap = Math.floor((cols - viewableCols) / 2);
  }

  return (
    <div
      ref={gridRef}
      className={styles.fluxelGrid}
      style={{ "--cols": cols } as React.CSSProperties}
    >
      <PixelAnim className={styles.fluxelGridBackground} />
      {grid.flat().map((data) => {
        const isVisible =
          data.col >= colOverlap &&
          data.col < cols - colOverlap &&
          data.row >= rowOverlap &&
          data.row < rows - rowOverlap;

        return isVisible ? (
          <Fluxel key={data.id} data={data} />
        ) : (
          <div key={data.id} className={styles.inactivePlaceholder}></div>
        );
      })}
    </div>
  );
};

export default FluxelGrid;
