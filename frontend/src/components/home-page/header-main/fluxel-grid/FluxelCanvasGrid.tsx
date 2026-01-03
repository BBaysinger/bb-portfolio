import clsx from "clsx";
import {
  useRef,
  useEffect,
  forwardRef,
  useImperativeHandle,
  useLayoutEffect,
  useCallback,
} from "react";

import type { FluxelGridHandle, FluxelGridProps } from "./FluxelAllTypes";
import styles from "./FluxelCanvasGrid.module.scss";
import { useFluxelResizeWatcher } from "./useFluxelResizeWatcher";

/**
 * KEEP: Come back to this when there is more time to explore different
 * render methods. We left off where it seemed like SVG was more optimal.
 * The goal is to explore and continue optimizing every rendering strategy.
 * Catches with Canvas:
 * 1. Prevent rerendering the entire canvas on every update.
 *
 * FluxelCanvasGrid - imperatively renders fluxels to a canvas.
 *
 */
const FluxelCanvasGrid = forwardRef<FluxelGridHandle, FluxelGridProps>(
  ({ gridData, onLayoutUpdateRequest, className, imperativeMode }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fluxelSizeRef = useRef<number>(0);
    const gridDataRef = useRef(gridData);

    const rows = gridData.length;
    const cols = gridData[0]?.length || 0;

    useLayoutEffect(() => {
      gridDataRef.current = gridData;
    }, [gridData]);

    const drawGrid = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const width = canvas.clientWidth * dpr;
      const height = canvas.clientHeight * dpr;

      canvas.width = width;
      canvas.height = height;

      canvas.style.width = `${Math.round(width / dpr)}px`;
      canvas.style.height = `${Math.round(height / dpr)}px`;

      const fluxelSize = Math.floor(Math.min(width / cols, height / rows)) || 1;
      fluxelSizeRef.current = fluxelSize;

      ctx.clearRect(0, 0, width, height);

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const { colorVariation } = gridDataRef.current[r][c];

          if (colorVariation === "transparent") continue;

          ctx.fillStyle = colorVariation ?? "red"; // 🔴 fallback for undefined colorVariation
          ctx.fillRect(c * fluxelSize, r * fluxelSize, fluxelSize, fluxelSize);
        }
      }
    }, [rows, cols]);

    useEffect(() => {
      drawGrid();
    }, [gridData, drawGrid]);

    const handleResize = useCallback(() => {
      if (typeof onLayoutUpdateRequest === "function") {
        onLayoutUpdateRequest(() => drawGrid());
      } else {
        drawGrid();
      }
    }, [onLayoutUpdateRequest, drawGrid]);

    useFluxelResizeWatcher(
      () => (canvasRef.current?.parentElement as HTMLDivElement | null) ?? null,
      handleResize,
    );

    useImperativeHandle(
      ref,
      () => ({
        getFluxelAt(x, y) {
          const canvas = canvasRef.current;
          const size = fluxelSizeRef.current;
          if (!canvas || size === 0) return null;

          const { left, top } = canvas.getBoundingClientRect();
          const relX = x - left;
          const relY = y - top;

          const row = Math.min(Math.floor(relY / size), rows - 1);
          const col = Math.min(Math.floor(relX / size), cols - 1);

          return gridDataRef.current[row]?.[col] ?? null;
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
          // Add pointer-tracking logic if needed later
        },
      }),
      [imperativeMode, rows, cols],
    );

    return (
      <canvas ref={canvasRef} className={clsx(styles.fluxelGrid, className)} />
    );
  },
);

FluxelCanvasGrid.displayName = "FluxelCanvasGrid";

export default FluxelCanvasGrid;
