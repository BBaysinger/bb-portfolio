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

import type { FluxelHandle, FluxelData } from "./FluxelAllTypes";
import type { FluxelGridHandle, FluxelGridProps } from "./FluxelAllTypes";
import FluxelSvg from "./FluxelSvg";
import styles from "./FluxelSvgGrid.module.scss";
import { useDebouncedResizeObserver } from "hooks/useDebouncedResizeObserver";

const FluxelSvgGrid = forwardRef<FluxelGridHandle, FluxelGridProps>(
  (
    {
      gridData,
      gridRef,
      viewableHeight,
      viewableWidth,
      onGridChange,
      imperativeMode = true,
      className = "",
    },
    ref,
  ) => {
    const [fluxelSize, setFluxelSize] = useState(0);
    const [rowCount, setRowCount] = useState(0);
    const [colCount, setColCount] = useState(0);

    const containerRef = useRef<HTMLDivElement | null>(null);
    const gridDataRef = useRef<FluxelData[][]>([]);
    const fluxelRefs = useRef<React.RefObject<FluxelHandle | null>[][]>([]);
    const viewableRowsRef = useRef(0);
    const viewableColsRef = useRef(0);

    useEffect(() => {
      const rows = gridData.length;
      const cols = gridData[0]?.length ?? 0;
      setRowCount(rows);
      setColCount(cols);
      gridDataRef.current = gridData;

      if (imperativeMode) {
        fluxelRefs.current = Array.from({ length: rows }, () =>
          Array.from({ length: cols }, () => createRef<FluxelHandle>()),
        );
      }
    }, [gridData, imperativeMode]);

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

      const vh = newSize;
      const vw = newSize;
      viewableRowsRef.current = Math.ceil(viewableHeight / vh);
      viewableColsRef.current = Math.ceil(viewableWidth / vw);
    }, [
      colCount,
      rowCount,
      fluxelSize,
      onGridChange,
      viewableHeight,
      viewableWidth,
    ]);

    useLayoutEffect(() => {
      updateSize();
    }, [updateSize]);

    useDebouncedResizeObserver(containerRef, updateSize, 50);

    const handleRef = (el: HTMLDivElement | null) => {
      containerRef.current = el;
      if (!gridRef) return;
      if (typeof gridRef === "function") gridRef(el);
      else
        (gridRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
    };

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

    const rowOverlap = Math.floor((rowCount - viewableRowsRef.current) / 2);
    const colOverlap = Math.floor((colCount - viewableColsRef.current) / 2);

    return (
      <div
        ref={handleRef}
        className={[styles.fluxelGrid, className].join(" ")}
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

              const ref = imperativeMode
                ? fluxelRefs.current[r]?.[c]
                : undefined;

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
    );
  },
);

export default FluxelSvgGrid;
