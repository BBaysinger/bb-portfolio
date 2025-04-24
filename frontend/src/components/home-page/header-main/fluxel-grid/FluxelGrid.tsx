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
  getElement: () => HTMLDivElement | null;
  getFluxelSize: () => number;
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
    const containerRef = useRef<HTMLDivElement>(null);
    const [fluxelSize, setFluxelSize] = useState(0);

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

    // 4) Expose getFluxelAt on the forwarded ref
    useImperativeHandle(
      ref,
      () => ({
        getFluxelAt(x, y) {
          const el = containerRef.current;
          if (!el || fluxelSize === 0) return null;

          const { left, top, width, height } = el.getBoundingClientRect();

          const relativeX = x - left;
          const relativeY = y - top;

          const halfwayX = width / 2;
          const halfwayY = height / 2;

          const c =
            relativeX < halfwayX
              ? Math.ceil(relativeX / fluxelSize)
              : Math.floor(relativeX / fluxelSize) - 1;

          const r =
            relativeY < halfwayY
              ? Math.ceil(relativeY / fluxelSize)
              : Math.floor(relativeY / fluxelSize) - 1;

          return r >= 0 && r < rows && c >= 0 && c < cols
            ? gridData[r][c]
            : null;
        },
        getElement() {
          return containerRef.current;
        },
        getFluxelSize() {
          return fluxelSize;
        },
      }),
      [fluxelSize, gridData],
    );

    return (
      <div
        ref={handleRef}
        className={styles.fluxelGrid}
        style={{ "--cols": cols } as React.CSSProperties}
      >
        <PixelAnim className={styles.fluxelGridBackground} />
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
