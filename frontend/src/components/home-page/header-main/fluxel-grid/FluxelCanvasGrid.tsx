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

/**
 * KEEP: Come back to this when there is more time to explore different
 * render methods. We left off where it seemed like SVG was more optimal.
 * The goal is to explore and continue optimizing every rendering strategy.
 * Catches with Canvas:
 * 1. Prevent rerendering the entire canvas on every update.
 *
 * FluxelCanvasGrid - imperatively renders fluxels to a canvas.
 *
 * @author Bradley Baysinger
 * @since 2025
 */
const FluxelCanvasGrid = forwardRef<FluxelGridHandle, FluxelGridProps>(
  (
    {
      gridData,
      viewableWidth,
      viewableHeight,
      onLayoutUpdateRequest,
      className,
      imperativeMode,
    },
    ref,
  ) => {
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
      const width = viewableWidth * dpr;
      const height = viewableHeight * dpr;

      canvas.width = width;
      canvas.height = height;

      canvas.style.width = `${viewableWidth}px`;
      canvas.style.height = `${viewableHeight}px`;

      const fluxelSize = Math.floor(Math.min(width / cols, height / rows));
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
    }, [viewableWidth, viewableHeight, rows, cols]);

    useEffect(() => {
      drawGrid();
    }, [gridData, viewableWidth, viewableHeight, drawGrid]);

    useEffect(() => {
      if (!canvasRef.current || !onLayoutUpdateRequest) return;

      const resizeObserver = new ResizeObserver(() => {
        onLayoutUpdateRequest(() => drawGrid());
      });

      resizeObserver.observe(canvasRef.current.parentElement!);

      return () => resizeObserver.disconnect();
    }, [onLayoutUpdateRequest, drawGrid]);

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
