import React, {
  forwardRef,
  useRef,
  useState,
  useEffect,
  useLayoutEffect,
  useImperativeHandle,
  createRef,
  useMemo,
  useCallback,
} from "react";

import type { FluxelHandle, FluxelData } from "./FluxelAllTypes";
import type { FluxelGridHandle, FluxelGridProps } from "./FluxelAllTypes";
import FluxelDomSvg from "./FluxelDomSvg";
import styles from "./FluxelDomSvgGrid.module.scss";
import { useDebouncedResizeObserver } from "hooks/useDebouncedResizeObserver";

/**
 * FluxelGrid
 *
 * This is a grid of fluxels (animated/fluxing pixels) that can be used to create
 * effects and animations. Like 8-bit pixel art, but with mondo-sized pixels that
 * each have an animatable shadow/depth affect.
 *
 * @author Bradley Baysinger
 * @since The beginning of time.
 * @version N/A
 */
const FluxelDomSvgGrid = forwardRef<FluxelGridHandle, FluxelGridProps>(
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

    const gridStyle = useMemo(
      () => ({ "--cols": colCount }) as React.CSSProperties,
      [colCount],
    );

    const rowOverlap = Math.floor((rowCount - viewableRowsRef.current) / 2);
    const colOverlap = Math.floor((colCount - viewableColsRef.current) / 2);

    const flatGrid = useMemo(() => gridData.flat(), [gridData]);

    return (
      <>
        <div
          ref={handleRef}
          className={[styles.fluxelGrid, className].join(" ")}
          style={gridStyle}
        >
          {flatGrid.map((data) => {
            const isVisible =
              data.col >= colOverlap &&
              data.col < colCount - colOverlap &&
              data.row >= rowOverlap &&
              data.row < rowCount - rowOverlap;

            const row = data.row;
            const col = data.col;
            const key = data.id;

            if (!isVisible) {
              return <div key={key} className={styles.inactivePlaceholder} />;
            }

            const ref = imperativeMode
              ? fluxelRefs.current[row]?.[col]
              : undefined;

            return <FluxelDomSvg key={key} data={data} ref={ref} />;
          })}
        </div>
        <div className={styles.overlayWrapper}>
          {flatGrid.map((data) => {
            const isVisible =
              data.col >= colOverlap &&
              data.col < colCount - colOverlap &&
              data.row >= rowOverlap &&
              data.row < rowCount - rowOverlap;

            const row = data.row;
            const col = data.col;
            const key = data.id;

            if (!isVisible) {
              return <div key={key} className={styles.inactivePlaceholder} />;
            }

            return (
              <div
                className={styles.overlay}
                key={key}
                style={{
                  top: `${row * fluxelSize}px`,
                  left: `${col * fluxelSize}px`,
                  backgroundColor: data.colorVariation,
                }}
              />
            );
          })}
        </div>
      </>
    );
  },
);

export default FluxelDomSvgGrid;
