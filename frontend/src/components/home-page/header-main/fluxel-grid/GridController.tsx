import {
  useState,
  useRef,
  useImperativeHandle,
  forwardRef,
  useEffect,
} from "react";

import FluxelSvgGrid from "./FluxelSvgGrid";
import FluxelDomSvgGrid from "./FluxelDomSvgGrid";
import FluxelPixiGrid from "./FluxelPixiGrid";
import { useFluxelShadows } from "./useFluxelShadows";
import useFluxelProjectiles, { Direction } from "./useFluxelProjectiles";
import AnimationSequencer from "./AnimationSequencer";
import type { FluxelGridHandle, FluxelData } from "./FluxelAllTypes";
import useResponsiveScaler from "hooks/useResponsiveScaler";
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
    const wrapperRef = useRef<HTMLDivElement | null>(null);
    const isShadowsPaused = useRef(false);
    const mousePosRef = useRef<{ x: number; y: number } | null>(null);

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

      mousePosRef.current = { x: localX, y: localY };
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

    useEffect(() => {
      if (useSlingerTracking) return;

      const handleMove = (event: PointerEvent) => {
        const isTouchOnly =
          "ontouchstart" in window && matchMedia("(pointer: coarse)").matches;

        const target = event.target as HTMLElement | null;
        const isSlingerTarget = target?.className?.includes("slinger");

        if (isTouchOnly && !isSlingerTarget) return;

        applyFluxPosition(event.clientX, event.clientY);
      };

      const clearPos = () => {
        mousePosRef.current = null;
      };

      window.addEventListener("pointerdown", handleMove);
      window.addEventListener("pointermove", handleMove);
      window.addEventListener("pointerleave", clearPos);
      window.addEventListener("scroll", clearPos, { passive: true });
      window.addEventListener("touchend", clearPos);

      return () => {
        window.removeEventListener("pointerdown", handleMove);
        window.removeEventListener("pointermove", handleMove);
        window.removeEventListener("pointerleave", clearPos);
        window.removeEventListener("scroll", clearPos);
        window.removeEventListener("touchend", clearPos);
      };
    }, [useSlingerTracking, viewableWidth, viewableHeight]);

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
          />
        ) : gridType === "domSvg" ? (
          <FluxelDomSvgGrid
            className={styles.fluxelGridDomSvg}
            ref={gridInstanceRef}
            gridData={gridData}
            viewableWidth={viewableWidth}
            viewableHeight={viewableHeight}
          />
        ) : (
          <FluxelPixiGrid
            className={styles.fluxelGridCanvas}
            ref={gridInstanceRef}
            gridData={gridData}
            viewableWidth={viewableWidth}
            viewableHeight={viewableHeight}
          />
        )}
      </div>
    );
  },
);

export default GridController;
