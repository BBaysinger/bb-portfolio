import clsx from "clsx";
import {
  useState,
  useRef,
  useImperativeHandle,
  forwardRef,
  useEffect,
} from "react";

import useElementRelativePointer from "@/hooks/useElementRelativePointer";
import useResponsiveScaler from "@/hooks/useResponsiveScaler";

import AnimationSequencer from "./AnimationSequencer";
import type { FluxelGridHandle, FluxelData } from "./FluxelAllTypes";
import FluxelCanvasGrid from "./FluxelCanvasGrid";
import FluxelSvgGrid from "./FluxelSvgGrid";
import styles from "./GridController.module.scss";
import useFluxelProjectiles, { Direction } from "./useFluxelProjectiles";
import { useFluxelShadows } from "./useFluxelShadows";

export interface GridControllerHandle {
  launchProjectile: (x: number, y: number, direction: Direction) => void;
  applyFluxPosition: (clientX: number, clientY: number) => void;
  resetAllFluxels: () => void;
  resumeShadows: () => void;
}

interface GridControllerProps {
  rows: number;
  cols: number;
  className?: string;
  useSlingerTracking?: boolean;
}

/**
 * GridController dynamically selects between different rendering strategies (SVG, Canvas, Pixi)
 * based on the URL query parameter `gridType`, and provides a unified interface for external
 * control of the underlying fluxel grid.
 *
 * The goal is to explore and continue optimizing every rendering strategy, so
 * DO NOT eliminate the various fluxel grids.
 *
 * It exposes methods to launch visual projectiles, apply pointer-based flux influence, reset
 * the grid state, and resume background visual effects (e.g. shadows).
 *
 * Internally, it:
 * - Uses either `<FluxelSvgGrid />` or `<FluxelCanvasGrid />` depending on URL param.
 * - Tracks relative pointer position and exposes an override for programmatic interactions.
 * - Manages internal grid state (`gridData`) and hooks into shadow and projectile effect logic.
 * - Scales the component responsively using `useResponsiveScaler`.
 *
 * Designed as a flexible controller component for fluxel-based visual effects and user interactions.
 *
 * @example
 * ```tsx
 * const gridRef = useRef<GridControllerHandle>(null);
 *
 * return (
 *   <GridController
 *     ref={gridRef}
 *     rows={10}
 *     cols={10}
 *     // No need to pass viewport dims; grids measure viewport internally.
 *   />
 * );
 *
 * // Programmatically launch a projectile
 * gridRef.current?.launchProjectile(100, 100, "right");
 * ```
 */
const GridController = forwardRef<GridControllerHandle, GridControllerProps>(
  ({ rows, cols, className, useSlingerTracking = false }, ref) => {
    const getGridTypeFromUrl = (): "svg" | "canvas" => {
      if (typeof window === "undefined") return "svg";

      const value = new URLSearchParams(window.location.search).get("gridType");

      if (value === "svg" || value === "canvas") {
        return value;
      }

      return "svg";
    };

    const gridType = getGridTypeFromUrl();

    const gridInstanceRef = useRef<FluxelGridHandle | null>(null);
    const containerRef = useRef<HTMLElement | null>(null);
    const wrapperRef = useRef<HTMLDivElement | null>(null);
    const isShadowsPaused = useRef(false);
    const pointerOverrideRef = useRef<{ x: number; y: number } | null>(null);

    const onLayoutUpdateRequest = (fn: () => void) => {
      fn(); // optionally debounce or throttle here if needed
    };

    useEffect(() => {
      const el = gridInstanceRef.current?.getContainerElement?.();
      if (el) containerRef.current = el;
      if (typeof window !== "undefined" && !containerRef.current) {
        containerRef.current = document.createElement("div");
      }

      return () => {
        if (containerRef.current) {
          containerRef.current = null;
        }
        if (gridInstanceRef.current) {
          gridInstanceRef.current = null;
        }
      };
    }, []);

    const pointerMeta = useElementRelativePointer(containerRef, {
      pointerdown: 0,
      pointermove: 0,
      pointerleave: 0,
      pointerup: 0,
      scroll: 100,
      resize: 50,
      orientationchange: 200,
      visibilitychange: 200,
      fullscreenchange: 200,
      mutate: -1,
      override: useSlingerTracking
        ? (pointerOverrideRef.current ?? undefined)
        : undefined,
    });

    const shouldNullifyPointer =
      !pointerMeta.isPointerDown && pointerMeta.isTouchEvent;

    const filteredPointerPos = () =>
      shouldNullifyPointer ? null : { x: pointerMeta.x, y: pointerMeta.y };

    useResponsiveScaler(
      4 / 3,
      1280,
      "cover",
      wrapperRef as React.RefObject<HTMLDivElement>,
    );

    const [gridData, setGridData] = useState<FluxelData[][]>(() =>
      Array.from({ length: rows }, (_, row) =>
        Array.from({ length: cols }, (_, col) => ({
          id: `${row}-${col}`,
          row,
          col,
          influence: 0,
          shadowTrOffsetX: 0,
          shadowTrOffsetY: 0,
          shadowBlOffsetX: 0,
          shadowBlOffsetY: 0,
          colorVariation: "transparent",
        })),
      ),
    );

    useFluxelShadows({
      gridRef: gridInstanceRef,
      setGridData,
      pointerPos: filteredPointerPos(),
      isPausedRef: isShadowsPaused,
      fps: 20,
    });

    const launchProjectile = useFluxelProjectiles({
      gridRef: gridInstanceRef,
      setGridData,
    });

    const applyFluxPosition = (clientX: number, clientY: number) => {
      const gridEl = gridInstanceRef.current?.getContainerElement?.();
      if (!gridEl) return;

      const rect = gridEl.getBoundingClientRect();
      const localX = clientX - rect.left;
      const localY = clientY - rect.top;

      pointerOverrideRef.current = { x: localX, y: localY };
    };

    useImperativeHandle(
      ref,
      () => ({
        launchProjectile,
        applyFluxPosition,
        resetAllFluxels: () => {
          isShadowsPaused.current = true;
          setGridData((prev) =>
            prev.map((row) =>
              row.map((fluxel) => ({
                ...fluxel,
                influence: 0,
                shadowTrOffsetX: 0,
                shadowTrOffsetY: 0,
                shadowBlOffsetX: 0,
                shadowBlOffsetY: 0,
                colorVariation: "transparent",
              })),
            ),
          );
        },
        resumeShadows: () => {
          isShadowsPaused.current = false;
        },
      }),
      [launchProjectile],
    );

    return (
      <div ref={wrapperRef} className={clsx(styles.gridController, className)}>
        <AnimationSequencer className={styles.animationSequencer} />

        {gridType === "svg" ? (
          <FluxelSvgGrid
            className={styles.fluxelGridSvg}
            ref={gridInstanceRef}
            gridData={gridData}
            onLayoutUpdateRequest={onLayoutUpdateRequest}
          />
        ) : gridType === "canvas" ? (
          <FluxelCanvasGrid
            className={styles.fluxelGridCanvas}
            ref={gridInstanceRef}
            gridData={gridData}
            onLayoutUpdateRequest={onLayoutUpdateRequest}
          />
        ) : (
          <>No grid matches: {gridType} </>
        )}
      </div>
    );
  },
);

GridController.displayName = "GridController";

export default GridController;
