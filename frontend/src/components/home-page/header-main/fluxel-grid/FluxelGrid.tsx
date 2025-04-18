import React, { useEffect, useState } from "react";
import Fluxel, { FluxelData } from "./Fluxel";
import PixelAnim from "./AnimationSequencer";
import styles from "./FluxelGrid.module.scss";

/**
 * FluxelGrid
 *
 * @author Bradley Baysinger
 * @since The beginning of time.
 * @version N/A
 */
const FluxelGrid: React.FC<{
  grid: FluxelData[][];
  gridRef: React.RefObject<HTMLDivElement | null>;
  viewableHeight: number;
  viewableWidth: number;
}> = ({ grid, gridRef, viewableHeight, viewableWidth }) => {
  const [_fluxelSize, setFluxelSize] = useState(0);
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;

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
