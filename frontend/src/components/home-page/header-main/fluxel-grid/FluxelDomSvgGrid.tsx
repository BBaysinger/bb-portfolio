import React, {
  forwardRef,
  useRef,
  useState,
  useEffect,
  useImperativeHandle,
  createRef,
} from "react";

import type { FluxelHandle, FluxelData } from "./FluxelAllTypes";
import type { FluxelGridHandle, FluxelGridProps } from "./FluxelAllTypes";
import FluxelDomSvg from "./FluxelDomSvg"; // or whatever the actual filename is
import styles from "./FluxelDomSvgGrid.module.scss";

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
    const containerRef = useRef<HTMLDivElement>(null);
    const gridDataRef = useRef<FluxelData[][]>([]);
    const fluxelRefs = useRef<React.RefObject<FluxelHandle | null>[][]>([]);

    const rows = gridData.length;
    const cols = gridData[0]?.length ?? 0;

    // Initialize 2D array of refs if in imperative mode
    useEffect(() => {
      if (imperativeMode) {
        fluxelRefs.current = Array.from({ length: rows }, () =>
          Array.from({ length: cols }, () => createRef<FluxelHandle>()),
        );
      }
    }, [imperativeMode, rows, cols]);

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

    useEffect(() => {
      const updateSize = () => {
        if (!containerRef.current) return;
        const { width } = containerRef.current.getBoundingClientRect();
        const newFluxelSize = width / cols;
        setFluxelSize(newFluxelSize);

        if (typeof onGridChange === "function") {
          onGridChange({ rows, cols, fluxelSize: newFluxelSize });
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
          const r = Math.min(Math.floor(relativeY / fluxelSize), rows - 1);
          const c = Math.min(Math.floor(relativeX / fluxelSize), cols - 1);

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
      [fluxelSize, gridData, imperativeMode],
    );

    return (
      <>
        <div
          ref={handleRef}
          className={[styles.fluxelGrid, className].join(" ")}
          style={{ "--cols": cols } as React.CSSProperties}
        >
          {gridData.flat().map((data) => {
            const isVisible =
              data.col >= colOverlap &&
              data.col < cols - colOverlap &&
              data.row >= rowOverlap &&
              data.row < rows - rowOverlap;

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
          {gridData.flat().map((data) => {
            const isVisible =
              data.col >= colOverlap &&
              data.col < cols - colOverlap &&
              data.row >= rowOverlap &&
              data.row < rows - rowOverlap;

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
