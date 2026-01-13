"use client";

import clsx from "clsx";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
} from "react";

import type { FluxelGridHandle, FluxelGridProps } from "./FluxelAllTypes";
import styles from "./FluxelCanvasGrid.module.scss";
import { useFluxelResizeWatcher } from "./useFluxelResizeWatcher";

/**
 * Canvas-backed fluxel grid renderer.
 *
 * Alternate implementation used for performance experimentation. It consumes
 * the same `FluxelData[][]` model as the SVG/Pixi renderers so the higher-level
 * controller and effect hooks remain renderer-agnostic.
 *
 * Known limitations:
 * - Full-canvas redraw on updates (no dirty-rect optimization yet).
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

      // Scale the backing buffer on high-DPI displays for crisp rendering.
      const dpr =
        typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
      const width = canvas.clientWidth * dpr;
      const height = canvas.clientHeight * dpr;

      canvas.width = width;
      canvas.height = height;

      canvas.style.width = `${Math.round(width / dpr)}px`;
      canvas.style.height = `${Math.round(height / dpr)}px`;

      // Guard against transient empty data to avoid division-by-zero and invalid indexing.
      if (rows <= 0 || cols <= 0) {
        fluxelSizeRef.current = 0;
        ctx.clearRect(0, 0, width, height);
        return;
      }

      const fluxelSize = Math.floor(Math.min(width / cols, height / rows)) || 1;
      fluxelSizeRef.current = fluxelSize;

      ctx.clearRect(0, 0, width, height);

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const cell = gridDataRef.current[r]?.[c];
          if (!cell) continue;

          const { colorVariation, influence } = cell;
          if (colorVariation === "transparent") continue;

          // Match the SVG renderer: default to an influence-based base color when
          // no explicit overlay color is provided.
          if (colorVariation) {
            ctx.fillStyle = colorVariation;
          } else {
            const alpha = Math.min(1, Math.max(0, influence * 1.0 - 0.1));
            ctx.fillStyle = `rgba(20, 20, 20, ${alpha})`;
          }

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
          if (!canvas || size === 0 || rows <= 0 || cols <= 0) return null;

          const { left, top } = canvas.getBoundingClientRect();
          const relX = x - left;
          const relY = y - top;

          const row = Math.min(Math.max(0, Math.floor(relY / size)), rows - 1);
          const col = Math.min(Math.max(0, Math.floor(relX / size)), cols - 1);

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
