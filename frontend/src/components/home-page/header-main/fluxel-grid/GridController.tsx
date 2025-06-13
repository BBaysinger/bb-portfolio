import {
  useState,
  useRef,
  useImperativeHandle,
  forwardRef,
  useEffect,
} from "react";

import FluxelSvgGrid from "./FluxelSvgGrid";
// import FluxelPixiGrid from "./FluxelPixiGrid";
import { useFluxelShadows } from "./useFluxelShadows";
import useFluxelProjectiles, { Direction } from "./useFluxelProjectiles";
import AnimationSequencer from "./AnimationSequencer";
import type { FluxelGridHandle, FluxelData } from "./FluxelAllTypes";
import useResponsiveScaler from "hooks/useResponsiveScaler";
import useElementRelativePointer from "hooks/useElementRelativePointer";
import styles from "./GridController.module.scss";

export interface GridControllerHandle {
  launchProjectile: (x: number, y: number, direction: Direction) => void;
  applyFluxPosition: (clientX: number, clientY: number) => void;
  resetAllFluxels: () => void;
  resumeShadows: () => void;
}

interface GridControllerProps {
  rows: number;
  cols: number;
  viewableHeight: number;
  viewableWidth: number;
  className?: string;
  useSlingerTracking?: boolean;
}

const GridController = forwardRef<GridControllerHandle, GridControllerProps>(
  (
    {
      rows,
      cols,
      viewableHeight,
      viewableWidth,
      className,
      useSlingerTracking = false,
    },
    ref,
  ) => {
    const getGridTypeFromUrl = (): "svg" | "domSvg" | "canvas" => {
      if (typeof window === "undefined") return "svg";

      const value = new URLSearchParams(window.location.search).get("gridType");

      if (value === "svg" || value === "domSvg" || value === "canvas") {
        return value;
      }

      return "svg";
    };

    const gridType = getGridTypeFromUrl();

    const gridInstanceRef = useRef<FluxelGridHandle | null>(null);
    const containerRef = useRef<HTMLElement>(document.createElement("div"));
    const wrapperRef = useRef<HTMLDivElement | null>(null);
    const isShadowsPaused = useRef(false);
    const pointerOverrideRef = useRef<{ x: number; y: number } | null>(null);

    const handleLayoutUpdateRequest = (fn: () => void) => {
      fn(); // optionally debounce or throttle here if needed
    };

    useEffect(() => {
      const el = gridInstanceRef.current?.getContainerElement?.();
      if (el) containerRef.current = el;
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
      <div
        ref={wrapperRef}
        className={[styles.gridController, className].join(" ")}
      >
        <AnimationSequencer className={styles.animationSequencer} />

        {gridType === "svg" ? (
          <FluxelSvgGrid
            className={styles.fluxelGridSvg}
            ref={gridInstanceRef}
            gridData={gridData}
            viewableWidth={viewableWidth}
            viewableHeight={viewableHeight}
            onLayoutUpdateRequest={handleLayoutUpdateRequest}
          />
        ) : (
          // ) : gridType === "canvas" ? (
          //   <FluxelPixiGrid
          //     className={styles.fluxelGridCanvas}
          //     ref={gridInstanceRef}
          //     gridData={gridData}
          //     viewableWidth={viewableWidth}
          //     viewableHeight={viewableHeight}
          //     onLayoutUpdateRequest={handleLayoutUpdateRequest}
          //   />
          <>No grid matches: {gridType} </>
        )}
      </div>
    );
  },
);

export default GridController;
