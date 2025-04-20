import React, {
  forwardRef,
  useRef,
  useState,
  useEffect,
  useImperativeHandle,
} from "react";

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
export interface FluxelGridHandle {
  getFluxelAt: (x: number, y: number) => FluxelData | null;
}

interface FluxelGridProps {
  grid: FluxelData[][];
  /**
   * Optional external ref to the grid's DOM element.
   * Could be a RefObject or a callback ref.
   */
  gridRef?: React.Ref<HTMLDivElement>;
  viewableHeight: number;
  viewableWidth: number;
}

const FluxelGrid = forwardRef<FluxelGridHandle, FluxelGridProps>(
  ({ grid, gridRef, viewableHeight, viewableWidth }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [fluxelSize, setFluxelSize] = useState(0);

    const rows = grid.length;
    const cols = grid[0]?.length ?? 0;

    // 1) Merge the two refs onto the same DOM node
    const handleRef = (el: HTMLDivElement | null) => {
      containerRef.current = el;
      if (!gridRef) return;
      if (typeof gridRef === "function") gridRef(el);
      else
        (gridRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
    };

    // 2) Recompute fluxelSize on mount + resize
    useEffect(() => {
      const updateSize = () => {
        if (containerRef.current) {
          setFluxelSize(containerRef.current.clientWidth / cols);
        }
      };
      updateSize();
      window.addEventListener("resize", updateSize);
      window.addEventListener("orientationchange", updateSize);
      return () => {
        window.removeEventListener("resize", updateSize);
        window.removeEventListener("orientationchange", updateSize);
      };
    }, [cols]);

    // 3) Compute which rows/cols are visible (using containerRef)
    let viewableRows = rows,
      viewableCols = cols,
      rowOverlap = 0,
      colOverlap = 0;

    if (containerRef.current) {
      viewableRows = Math.ceil(
        viewableHeight / (containerRef.current.offsetHeight / rows),
      );
      viewableCols = Math.ceil(
        viewableWidth / (containerRef.current.offsetWidth / cols),
      );
      rowOverlap = Math.floor((rows - viewableRows) / 2);
      colOverlap = Math.floor((cols - viewableCols) / 2);
    }

    // 4) Expose getFluxelAt on the forwarded ref
    useImperativeHandle(
      ref,
      () => ({
        getFluxelAt(x, y) {
          const el = containerRef.current;
          if (!el || fluxelSize === 0) return null;
          const { left, top } = el.getBoundingClientRect();
          const c = Math.floor((x - left) / fluxelSize);
          const r = Math.floor((y - top) / fluxelSize);
          return r >= 0 && r < rows && c >= 0 && c < cols ? grid[r][c] : null;
        },
      }),
      [fluxelSize, grid],
    );

    return (
      <div
        ref={handleRef}
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
            <div key={data.id} className={styles.inactivePlaceholder} />
          );
        })}
      </div>
    );
  },
);

export default FluxelGrid;
