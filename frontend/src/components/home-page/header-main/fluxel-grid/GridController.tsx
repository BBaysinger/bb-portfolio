import clsx from "clsx";
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
const IOS_SAFARI_GRIDLINE_OFFSET_Y = 0; // Safari paints background gradients high on iOS
const IOS_SAFARI_GRIDLINE_OFFSET_X = 0; // Safari paints background gradients left on iOS

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

type GridType = "svg" | "canvas" | "pixi";

const getGridTypeFromLocation = (): GridType => {
  if (typeof window === "undefined") return "svg";

  try {
    const sp = new URLSearchParams(window.location.search);
    const value = sp.get("gridType");
    if (value === "svg" || value === "canvas" || value === "pixi") return value;
  } catch {
    // Ignore invalid URLSearchParams (should be rare)
  }

  return "svg";
};

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
 * SVG grid lines used, as a CSS gradient-simulated lines proved inconsistent in alignment across mobile browsers.
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
    const [gridType, setGridType] = useState<GridType>(() =>
      getGridTypeFromLocation(),
    );

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

    useEffect(() => {
      // Handle back/forward updates where search params may change.
      const onPopState = () => setGridType(getGridTypeFromLocation());
      window.addEventListener("popstate", onPopState);
      return () => window.removeEventListener("popstate", onPopState);
    }, []);

    const gridLinesPathD = useMemo(() => {
      // No frame: only interior separators.
      const pathParts: string[] = [];

      for (let x = 1; x < cols; x++) {
        pathParts.push(`M${x} 0V${rows}`);
      }
      for (let y = 1; y < rows; y++) {
        pathParts.push(`M0 ${y}H${cols}`);
      }

      return pathParts.join(" ");
    }, [cols, rows]);
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

    // Cover-scale a fixed-aspect (4:3) grid based on the actual hero element size.
    // This avoids relying on viewport unit measurement timing, which can be
    // transiently wrong on some iOS browsers until the first interaction.
    useEffect(() => {
      if (typeof window === "undefined" || typeof document === "undefined") {
        return;
      }

      const targetEl =
        (document.getElementById("hero") as HTMLElement | null) ??
        (wrapperRef.current?.parentElement as HTMLElement | null);
      const outEl = wrapperRef.current;
      if (!targetEl || !outEl || typeof ResizeObserver === "undefined") {
        return;
      }

      let rafId: number | null = null;
      const aspectRatio = 4 / 3;
      const baseWidth = 1280;

      const apply = () => {
        rafId = null;
        const w = targetEl.clientWidth;
        const h = targetEl.clientHeight;
        if (w <= 0 || h <= 0) return;

        const screenAspect = w / h;
        const useWidth = screenAspect > aspectRatio; // cover
        const width = useWidth ? w : h * aspectRatio;
        const height = useWidth ? w / aspectRatio : h;
        const offsetX = (w - width) / 2;
        const offsetY = (h - height) / 2;
        const scale = width / baseWidth;

        outEl.style.setProperty("--responsive-scaler-width", `${width}px`);
        outEl.style.setProperty("--responsive-scaler-height", `${height}px`);
        outEl.style.setProperty("--responsive-scaler-offset-x", `${offsetX}px`);
        outEl.style.setProperty("--responsive-scaler-offset-y", `${offsetY}px`);
        outEl.style.setProperty("--responsive-scaler-scale", `${scale}`);
      };

      const schedule = () => {
        if (rafId !== null) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(apply);
      };

      const ro = new ResizeObserver(schedule);
      ro.observe(targetEl);

      // Run immediately + a short delayed retry for iOS initial-settle cases.
      schedule();
      const t = window.setTimeout(schedule, 250);

      return () => {
        ro.disconnect();
        window.clearTimeout(t);
        if (rafId !== null) cancelAnimationFrame(rafId);
      };
    }, []);

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
          <div className={styles.gridLinesOverlay} aria-hidden="true">
            <svg
              className={styles.gridLinesSvg}
              width={cols * gridLinesLayout.cellSize}
              height={rows * gridLinesLayout.cellSize}
              viewBox={`0 0 ${cols} ${rows}`}
              preserveAspectRatio="none"
              style={
                {
                  left: `${gridLinesLayout.offsetX + browserGridOffsets.x}px`,
                  top: `${gridLinesLayout.offsetY + browserGridOffsets.y}px`,
                } as React.CSSProperties
              }
            >
              <path
                d={gridLinesPathD}
                fill="none"
                stroke="var(--grid-line-color)"
                strokeWidth="var(--stroke-width)"
                vectorEffect="non-scaling-stroke"
                shapeRendering="crispEdges"
              />
            </svg>
          </div>
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
