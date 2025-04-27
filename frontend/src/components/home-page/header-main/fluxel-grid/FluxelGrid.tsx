import React, {
  forwardRef,
  useRef,
  useState,
  useEffect,
  useImperativeHandle,
} from "react";

import Fluxel, { FluxelData } from "./Fluxel";
import styles from "./FluxelGrid.module.scss";

/**
 * FluxelGrid
 *
 * This is a grid of fluxels (animated/fluxing pixels) that can be used to create
 * effects and animations. Like 8-bit pixel art, but with mondo-sized pixels.
 *
 * @author Bradley Baysinger
 * @since The beginning of time.
 * @version N/A
 */
export interface FluxelGridHandle {
  getFluxelAt: (x: number, y: number) => FluxelData | null;
  getElement: () => HTMLDivElement | null;
  getFluxelSize: () => number;
  getGridData: () => FluxelData[][];
}

interface FluxelGridProps {
  gridData: FluxelData[][];
  gridRef?: React.Ref<HTMLDivElement>;
  viewableHeight: number;
  viewableWidth: number;
  onGridChange?: (info: {
    rows: number;
    cols: number;
    fluxelSize: number;
  }) => void;
}

const FluxelGrid = forwardRef<FluxelGridHandle, FluxelGridProps>(
  ({ gridData, gridRef, viewableHeight, viewableWidth, onGridChange }, ref) => {
    const [fluxelSize, setFluxelSize] = useState(0);

    const containerRef = useRef<HTMLDivElement>(null);
    const gridDataRef = useRef<FluxelData[][]>([]);

    const rows = gridData.length;
    const cols = gridData[0]?.length ?? 0;

    // 1) Merge the two refs onto the same DOM node
    const handleRef = (el: HTMLDivElement | null) => {
      containerRef.current = el;
      if (!gridRef) return;
      if (typeof gridRef === "function") gridRef(el);
      else
        (gridRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
    };

    useEffect(() => {
      gridDataRef.current = gridData;
    }, [gridData]);

    // 2) Recompute fluxelSize on mount + resize
    useEffect(() => {
      const updateSize = () => {
        if (!containerRef.current) return;
        const { width } = containerRef.current.getBoundingClientRect();
        const newFluxelSize = width / cols;
        setFluxelSize(newFluxelSize);

        // Notify parent if callback provided
        if (typeof onGridChange === "function") {
          onGridChange({
            rows,
            cols,
            fluxelSize: newFluxelSize,
          });
        }
      };

      updateSize();
      window.addEventListener("resize", updateSize);
      window.addEventListener("orientationchange", updateSize);
      return () => {
        window.removeEventListener("resize", updateSize);
        window.removeEventListener("orientationchange", updateSize);
      };
    }, [cols, rows]);

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

    // 4) Expose imperative functions on the forwarded ref
    useImperativeHandle(
      ref,
      () => ({
        getFluxelAt(x, y) {
          const el = containerRef.current;
          if (!el || fluxelSize === 0) return null;

          const { left, top } = el.getBoundingClientRect();

          const relativeX = x - left;
          const relativeY = y - top;

          const currentGridData = gridDataRef.current;
          const rows = currentGridData.length;
          const cols = currentGridData[0]?.length ?? 0;

          const c = Math.min(Math.floor(relativeX / fluxelSize), cols - 1);
          const r = Math.min(Math.floor(relativeY / fluxelSize), rows - 1);

          if (!currentGridData[r] || !currentGridData[r][c]) return null;

          return currentGridData[r][c];
        },
        getElement() {
          return containerRef.current;
        },
        getFluxelSize() {
          return fluxelSize;
        },
        getGridData: () => gridDataRef.current,
      }),
      [fluxelSize, gridData],
    );

    return (
      <div
        ref={handleRef}
        className={styles.fluxelGrid}
        style={{ "--cols": cols } as React.CSSProperties}
      >
        {gridData.flat().map((data) => {
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
