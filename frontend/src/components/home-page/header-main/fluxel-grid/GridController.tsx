import clsx from "clsx";
import { useSearchParams } from "next/navigation";
import {
  useState,
  useRef,
  useImperativeHandle,
  forwardRef,
  useEffect,
  useMemo,
  useCallback,
} from "react";

import useElementRelativePointer from "@/hooks/useElementRelativePointer";
import useResponsiveScaler from "@/hooks/useResponsiveScaler";

import AnimationSequencer from "./AnimationSequencer";
import type { FluxelGridHandle, FluxelData } from "./FluxelAllTypes";
import FluxelCanvasGrid from "./FluxelCanvasGrid";
import FluxelPixiGrid from "./FluxelPixiGrid";
import FluxelSvgGrid from "./FluxelSvgGrid";
import styles from "./GridController.module.scss";
import ProjectilesOverlay from "./ProjectilesOverlay";
import useFluxelProjectiles, { Direction } from "./useFluxelProjectiles";
import { useFluxelShadows } from "./useFluxelShadows";

// Workarounds for iOS Safari rendering offsets
const IOS_SAFARI_GRIDLINE_OFFSET_Y = 1; // Safari paints background gradients high on iOS
const IOS_SAFARI_GRIDLINE_OFFSET_X = 1; // Safari paints background gradients left on iOS

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
    const searchParams = useSearchParams();
    const gridType = useMemo(() => {
      const value = searchParams?.get("gridType");
      if (value === "svg" || value === "canvas" || value === "pixi") {
        return value;
      }
      return "pixi";
    }, [searchParams]);

    const gridInstanceRef = useRef<FluxelGridHandle | null>(null);
    const [gridContainerEl, setGridContainerEl] = useState<HTMLElement | null>(
      null,
    );
    const wrapperRef = useRef<HTMLDivElement | null>(null);
    const isShadowsPaused = useRef(false);
    const [overlayFluxelSize, setOverlayFluxelSize] = useState(0);
    const [gridLinesLayout, setGridLinesLayout] = useState(() => ({
      cellSize: 0,
      offsetX: 0,
      offsetY: 0,
    }));
    const browserGridOffsets = useMemo(() => {
      if (typeof window === "undefined" || typeof navigator === "undefined") {
        return { x: 0, y: 0 };
      }

      const ua = navigator.userAgent;
      const isIOSDevice =
        /iP(ad|hone|od)/.test(ua) ||
        (ua.includes("Mac") && "ontouchend" in window);
      const isSafariEngine =
        /Safari/.test(ua) &&
        !/(Chrome|CriOS|FxiOS|OPiOS|EdgiOS|Brave)/.test(ua);

      if (isIOSDevice && isSafariEngine) {
        return {
          x: IOS_SAFARI_GRIDLINE_OFFSET_X,
          y: IOS_SAFARI_GRIDLINE_OFFSET_Y,
        };
      }

      return { x: 0, y: 0 };
    }, []);
    const [pointerOverride, setPointerOverride] = useState<
      { x: number; y: number } | undefined
    >(undefined);
    const pendingPointerOverride = useRef<{ x: number; y: number } | undefined>(
      undefined,
    );
    const overrideFrameId = useRef<number | null>(null);

    const syncContainerRef = useCallback(() => {
      const el = gridInstanceRef.current?.getContainerElement?.() ?? null;
      setGridContainerEl((prev) => (prev !== el ? el : prev));
    }, []);

    const refreshLayoutMetrics = useCallback(() => {
      syncContainerRef();
      const size = gridInstanceRef.current?.getFluxelSize?.() ?? 0;
      setOverlayFluxelSize((prev) => (prev !== size ? size : prev));

      const wrapper = wrapperRef.current;
      if (!wrapper || size <= 0) return;
      const w = wrapper.clientWidth;
      const h = wrapper.clientHeight;
      if (w <= 0 || h <= 0) return;

      const offsetX = Math.round((w - cols * size) / 2);
      const offsetY = Math.round((h - rows * size) / 2);
      setGridLinesLayout((prev) =>
        prev.cellSize !== size ||
        prev.offsetX !== offsetX ||
        prev.offsetY !== offsetY
          ? { cellSize: size, offsetX, offsetY }
          : prev,
      );
    }, [cols, rows, syncContainerRef]);

    const onLayoutUpdateRequest = useCallback(
      (fn: () => void) => {
        fn();
        refreshLayoutMetrics();
      },
      [refreshLayoutMetrics],
    );

    useEffect(() => {
      if (typeof window === "undefined") return;

      const runSync = () => syncContainerRef();
      const rafId = window.requestAnimationFrame(runSync);
      const intervalId = window.setInterval(runSync, 750);

      return () => {
        window.cancelAnimationFrame(rafId);
        window.clearInterval(intervalId);
      };
    }, [syncContainerRef]);

    useEffect(() => {
      if (!gridContainerEl) return;
      const rafId = window.requestAnimationFrame(() => {
        refreshLayoutMetrics();
      });
      return () => window.cancelAnimationFrame(rafId);
    }, [gridContainerEl, refreshLayoutMetrics]);

    useEffect(() => {
      return () => {
        if (gridInstanceRef.current) {
          gridInstanceRef.current = null;
        }
        if (overrideFrameId.current !== null) {
          cancelAnimationFrame(overrideFrameId.current);
        }
      };
    }, []);

    const pointerTargetRef = useRef<HTMLElement | null>(gridContainerEl);
    useEffect(() => {
      pointerTargetRef.current = gridContainerEl;
    }, [gridContainerEl]);

    const pointerMeta = useElementRelativePointer(pointerTargetRef, {
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
      override: useSlingerTracking ? pointerOverride : undefined,
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
      containerEl: gridContainerEl ?? undefined,
      setGridData,
      pointerPos: filteredPointerPos(),
      isPausedRef: isShadowsPaused,
      fps: 20,
    });

    const [projectiles, launchProjectile] = useFluxelProjectiles({
      gridRef: gridInstanceRef,
    });

    const applyFluxPosition = useCallback(
      (clientX: number, clientY: number) => {
        const gridEl =
          gridContainerEl ?? gridInstanceRef.current?.getContainerElement?.();
        if (!gridEl) return;

        const rect = gridEl.getBoundingClientRect();
        const localX = clientX - rect.left;
        const localY = clientY - rect.top;

        pendingPointerOverride.current = { x: localX, y: localY };
        if (overrideFrameId.current === null) {
          overrideFrameId.current = requestAnimationFrame(() => {
            overrideFrameId.current = null;
            setPointerOverride(pendingPointerOverride.current);
            pendingPointerOverride.current = undefined;
          });
        }
      },
      [gridContainerEl],
    );

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
      [launchProjectile, applyFluxPosition],
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
        ) : gridType === "pixi" ? (
          <FluxelPixiGrid
            className={styles.fluxelGridCanvas}
            ref={gridInstanceRef}
            gridData={gridData}
            onLayoutUpdateRequest={onLayoutUpdateRequest}
          />
        ) : (
          <>No grid matches: {gridType} </>
        )}

        {gridLinesLayout.cellSize > 0 ? (
          <div
            className={styles.gridLinesOverlay}
            style={
              {
                "--grid-cell-size": `${gridLinesLayout.cellSize}px`,
                "--grid-offset-x": `${gridLinesLayout.offsetX}px`,
                "--grid-offset-y": `${gridLinesLayout.offsetY}px`,
                "--grid-browser-offset-x": `${browserGridOffsets.x}px`,
                "--grid-browser-offset-y": `${browserGridOffsets.y}px`,
              } as React.CSSProperties
            }
          />
        ) : null}

        <ProjectilesOverlay
          className={styles.projectilesOverlay}
          projectiles={projectiles}
          fluxelSize={overlayFluxelSize}
          rows={rows}
          cols={cols}
        />
      </div>
    );
  },
);

GridController.displayName = "GridController";

export default GridController;
