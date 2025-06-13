import { useRef, useEffect, forwardRef, useImperativeHandle } from "react";

import type { FluxelGridHandle, FluxelGridProps } from "./FluxelAllTypes";
import styles from "./FluxelCanvasGrid.module.scss";

/**
 * FluxelCanvasGrid - imperatively renders fluxels to a canvas.
 *
 * @author Bradley Baysinger
 * @since The beginning of time.
 * @version Enhanced with containerRef sync, debounced resize observer, and stable data refs
 */
const FluxelCanvasGrid = forwardRef<FluxelGridHandle, FluxelGridProps>(
  ({ gridData, imperativeMode, className }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fluxelSizeRef = useRef(0);
    const gridDataRef = useRef(gridData);

    const rows = gridData.length;
    const cols = gridData[0]?.length || 0;

    useEffect(() => {
      gridDataRef.current = gridData;
    }, [gridData]);

    useEffect(() => {
      // let destroyed = false;
      // let frameId: number;

      // frameId = requestAnimationFrame(() => {
      //   const canvas = canvasRef.current;
      //   if (!canvas || destroyed) return;

      //   const rect = canvas.getBoundingClientRect();
      //   // const dpr = window.devicePixelRatio || 1;

      //   const fallbackWidth = 800;
      //   const fallbackHeight = 600;

      //   let width = rect.width;
      //   let height = rect.height;

      //   if (width < 1 || height < 1 || !isFinite(width) || !isFinite(height)) {
      //     console.warn("⚠️ Invalid canvas size detected. Using fallback.");
      //     width = fallbackWidth;
      //     height = fallbackHeight;
      //   }

      //   // const app = new Application();
      // });

      return () => {};
    }, [rows, cols]);

    useImperativeHandle(
      ref,
      () => ({
        getFluxelAt(x, y) {
          const canvas = canvasRef.current;
          const size = fluxelSizeRef.current;
          if (!canvas || size === 0) return null;

          const { left, top } = canvas.getBoundingClientRect();
          const relativeX = x - left;
          const relativeY = y - top;

          const r = Math.min(Math.floor(relativeY / size), rows - 1);
          const c = Math.min(Math.floor(relativeX / size), cols - 1);

          return gridDataRef.current[r]?.[c] || null;
        },
        getContainerElement() {
          return canvasRef.current?.parentElement as HTMLDivElement | null;
        },
        getFluxelSize() {
          return fluxelSizeRef.current;
        },
        getGridData() {
          return gridDataRef.current;
        },
        trackPosition() {
          if (!imperativeMode) return;
        },
      }),
      [imperativeMode],
    );

    return (
      <canvas
        ref={canvasRef}
        className={[styles.fluxelGrid, className].join(" ")}
      />
    );
  },
);

export default FluxelCanvasGrid;
