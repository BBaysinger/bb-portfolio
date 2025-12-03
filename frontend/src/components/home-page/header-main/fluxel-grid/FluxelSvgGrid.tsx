import clsx from "clsx";
import React, {
  forwardRef,
  useRef,
  useState,
  useEffect,
  useLayoutEffect,
  useImperativeHandle,
  createRef,
  useCallback,
} from "react";

import useResponsiveScaler from "@/hooks/useResponsiveScaler";

import type { FluxelHandle, FluxelData } from "./FluxelAllTypes";
import type { FluxelGridHandle, FluxelGridProps } from "./FluxelAllTypes";
import FluxelSvg from "./FluxelSvg";
import styles from "./FluxelSvgGrid.module.scss";

const assignRef = <T,>(ref: React.Ref<T> | undefined, value: T) => {
  if (!ref) return;
  if (typeof ref === "function") {
    ref(value);
  } else {
    (ref as React.MutableRefObject<T>).current = value;
  }
};

/**
 * Fluxing Pixel - SVG implementation. (Group elements arranged within a single SVG.)
 *
 * A square/pixel on the grid that can simulate depth and have color variations
 * applied to it.
 *
 */
const FluxelSvgGrid = forwardRef<FluxelGridHandle, FluxelGridProps>(
  (
    {
      gridData,
      gridRef,
      onGridChange,
      imperativeMode = true,
      className = "",
      onLayoutUpdateRequest,
    },
    ref,
  ) => {
    const [fluxelSize, setFluxelSize] = useState(0);
    const [rowCount, setRowCount] = useState(0);
    const [colCount, setColCount] = useState(0);
    const [viewableRows, setViewableRows] = useState(0);
    const [viewableCols, setViewableCols] = useState(0);

    const containerRef = useRef<HTMLDivElement | null>(null);
    const gridDataRef = useRef<FluxelData[][]>([]);
    const fluxelRefs = useRef<React.RefObject<FluxelHandle | null>[][]>([]);
    const [fluxelRefGrid, setFluxelRefGrid] = useState<
      React.RefObject<FluxelHandle | null>[][]
    >([]);
    const viewableRowsRef = useRef(0);
    const viewableColsRef = useRef(0);

    useEffect(() => {
      const rows = gridData.length;
      const cols = gridData[0]?.length ?? 0;
      gridDataRef.current = gridData;

      let refMatrix: React.RefObject<FluxelHandle | null>[][] = [];
      if (imperativeMode) {
        refMatrix = Array.from({ length: rows }, () =>
          Array.from({ length: cols }, () => createRef<FluxelHandle>()),
        );
      }
      fluxelRefs.current = refMatrix;

      const rafId = requestAnimationFrame(() => {
        setRowCount(rows);
        setColCount(cols);
        setFluxelRefGrid(refMatrix);
      });

      return () => cancelAnimationFrame(rafId);
    }, [gridData, imperativeMode]);

    // Stable viewport-driven scaler (svw/svh) for cropping math; no elementRef needed here.
    const scaler = useResponsiveScaler(4 / 3, 1280, "cover");

    const updateSize = useCallback(() => {
      const el = containerRef.current;
      if (!el || colCount === 0 || rowCount === 0) return;

      const width = el.clientWidth;
      const newSize = width / colCount;

      if (newSize > 0 && newSize !== fluxelSize) {
        setFluxelSize(newSize);
        if (typeof onGridChange === "function") {
          onGridChange({ rows: rowCount, cols: colCount, fluxelSize: newSize });
        }
      }
      // Number of visible rows/cols is based on scaler's effective width/height
      const effW = scaler.width || width;
      const effH = scaler.height || el.clientHeight || width;
      const cell = newSize || 1;
      const nextViewableRows = Math.ceil(effH / cell);
      const nextViewableCols = Math.ceil(effW / cell);
      viewableRowsRef.current = nextViewableRows;
      viewableColsRef.current = nextViewableCols;
      if (viewableRows !== nextViewableRows) {
        setViewableRows(nextViewableRows);
      }
      if (viewableCols !== nextViewableCols) {
        setViewableCols(nextViewableCols);
      }
    }, [
      colCount,
      rowCount,
      fluxelSize,
      onGridChange,
      scaler.width,
      scaler.height,
      viewableRows,
      viewableCols,
    ]);

    useLayoutEffect(() => {
      updateSize();
    }, [updateSize]);

    // useElementObserver(containerRef, updateSize);

    const handleRef = (el: HTMLDivElement | null) => {
      containerRef.current = el;
      assignRef(gridRef, el);
    };

    useEffect(() => {
      if (typeof onLayoutUpdateRequest === "function") {
        onLayoutUpdateRequest(updateSize);
      }
    }, [updateSize, onLayoutUpdateRequest]);

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
          const r = Math.min(Math.floor(relativeY / fluxelSize), rowCount - 1);
          const c = Math.min(Math.floor(relativeX / fluxelSize), colCount - 1);

          return currentGridData[r]?.[c] || null;
        },
        getContainerElement() {
          return containerRef.current;
        },
        getFluxelSize() {
          return fluxelSize;
        },
        getGridData() {
          return gridDataRef.current;
        },
        trackPosition(row, col, influence, color) {
          if (!imperativeMode) return;
          const ref = fluxelRefs.current[row]?.[col];
          ref?.current?.updateInfluence(influence, color);
        },
      }),
      [fluxelSize, imperativeMode, rowCount, colCount],
    );

    const rowOverlap = Math.max(0, Math.floor((rowCount - viewableRows) / 2));
    const colOverlap = Math.max(0, Math.floor((colCount - viewableCols) / 2));

    return (
      <>
        <div
          ref={handleRef}
          className={clsx(styles.fluxelGrid, className)}
          style={{ position: "relative", width: "100%", height: "100%" }}
        >
          <svg
            width="100%"
            height="100%"
            style={{ display: "block" }}
            viewBox={`0 0 ${colCount * fluxelSize} ${rowCount * fluxelSize}`}
          >
            <defs>
              <clipPath id="fluxel-clip">
                <rect x="0" y="0" width={fluxelSize} height={fluxelSize} />
              </clipPath>
            </defs>

            {gridData.map((row, r) =>
              row.map((data, c) => {
                const isVisible =
                  r >= rowOverlap &&
                  r < rowCount - rowOverlap &&
                  c >= colOverlap &&
                  c < colCount - colOverlap;

                if (!isVisible) return null;

                const ref = imperativeMode ? fluxelRefGrid[r]?.[c] : undefined;

                return (
                  <FluxelSvg
                    className={styles.fluxel}
                    key={data.id}
                    data={data}
                    x={c * fluxelSize}
                    y={r * fluxelSize}
                    size={fluxelSize}
                    clipPathId="fluxel-clip"
                    ref={ref}
                  />
                );
              }),
            )}
          </svg>
        </div>
        <div className={styles.overlayWrapper}>
          {gridData.map((row, r) =>
            row.map((data, c) => {
              const isVisible =
                r >= rowOverlap &&
                r < rowCount - rowOverlap &&
                c >= colOverlap &&
                c < colCount - colOverlap;

              if (!isVisible) {
                return (
                  <div key={data.id} className={styles.inactivePlaceholder} />
                );
              }

              return (
                <div
                  className={styles.overlay}
                  key={data.id}
                  style={{
                    top: `${r * fluxelSize}px`,
                    left: `${c * fluxelSize}px`,
                    backgroundColor: data.colorVariation,
                  }}
                />
              );
            }),
          )}
        </div>
      </>
    );
  },
);

FluxelSvgGrid.displayName = "FluxelSvgGrid";

export default FluxelSvgGrid;
