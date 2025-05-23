import {
  useState,
  useRef,
  useImperativeHandle,
  forwardRef,
  useEffect,
} from "react";

import FluxelGrid from "./FluxelGrid";
import { useFluxelShadows } from "./useFluxelShadows";
import useFluxelProjectiles, { Direction } from "./useFluxelProjectiles";
import AnimationSequencer from "./AnimationSequencer";
import type { FluxelGridHandle } from "./FluxelGrid"; // make sure to import this
import type { FluxelData } from "./Fluxel";
import styles from "./GridController.module.scss";

export interface GridControllerHandle {
  launchProjectile: (x: number, y: number, direction: Direction) => void;
  applyPointerPosition: (clientX: number, clientY: number) => void;
}

interface GridControllerProps {
  rows: number;
  cols: number;
  viewableHeight: number;
  viewableWidth: number;
  className?: string;
  usePointerTracking?: boolean; // <-- NEW
}

const FRAME_TIME = 1000 / 20;

/**
 * GridController
 *
 * Handles the grid and the effects we're applying to it. Do it here so the
 * grid doesn't know anything specific about how we're using it.
 *
 * @author Bradley Baysinger
 * @since The beginning of time.
 * @version N/A
 */
const GridController = forwardRef<GridControllerHandle, GridControllerProps>(
  (
    {
      rows,
      cols,
      viewableHeight,
      viewableWidth,
      className,
      usePointerTracking = true,
    },
    ref,
  ) => {
    const gridInstanceRef = useRef<FluxelGridHandle>(null);
    const wrapperRef = useRef<HTMLDivElement | null>(null);

    /* ------------------------------------------------------------------ */
    /*  Grid state                                                        */
    /* ------------------------------------------------------------------ */

    const [gridData, setGridData] = useState<FluxelData[][]>(() =>
      Array.from({ length: rows }, (_, row) =>
        Array.from({ length: cols }, (_, col) => ({
          id: `${row}-${col}`,
          row,
          col,
          influence: 0,
          shadow1OffsetX: 0,
          shadow1OffsetY: 0,
          shadow2OffsetX: 0,
          shadow2OffsetY: 0,
          colorVariation: "transparent",
        })),
      ),
    );

    /* ------------------------------------------------------------------ */
    /*  Local pointer position (fallback if parent isn't supplying one)   */
    /* ------------------------------------------------------------------ */

    const mousePosRef = useRef<{ x: number; y: number } | null>(null);

    /* ------------------------------------------------------------------ */
    /*  Shadow & projectile helpers                                       */
    /* ------------------------------------------------------------------ */

    useFluxelShadows({
      gridRef: gridInstanceRef,
      setGridData,
      mousePosRef,
    });

    const launchProjectile = useFluxelProjectiles({
      gridRef: gridInstanceRef,
      setGridData,
    });

    useImperativeHandle(
      ref,
      () => ({
        launchProjectile,
        applyPointerPosition: applyPointerPosition, // <- call it with global coords
      }),
      [launchProjectile],
    );

    /* ------------------------------------------------------------------ */
    /*  Pointer‑tracking effect                                           */
    /* ------------------------------------------------------------------ */

    const lastFrameTime = useRef(0);

    const applyPointerPosition = (clientX: number, clientY: number) => {
      const gridEl = gridInstanceRef.current?.getElement();
      if (!gridEl) return;

      const now = performance.now();
      if (now - lastFrameTime.current < FRAME_TIME) return;
      lastFrameTime.current = now;

      const rect = gridEl.getBoundingClientRect();
      const localX = clientX - rect.left;
      const localY = clientY - rect.top;

      mousePosRef.current = { x: localX, y: localY };
    };

    useEffect(() => {
      if (!usePointerTracking) return;

      const handleMove = (event: PointerEvent) => {
        const isTouchOnly =
          "ontouchstart" in window && matchMedia("(pointer: coarse)").matches;

        const target = event.target as HTMLElement | null;
        const isSlingerTarget = target?.className?.includes("slinger");

        if (isTouchOnly && !isSlingerTarget) return;

        applyPointerPosition(event.clientX, event.clientY);
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
    }, [usePointerTracking, viewableWidth, viewableHeight]);

    /* ------------------------------------------------------------------ */
    /*  Render                                                            */
    /* ------------------------------------------------------------------ */

    return (
      <div
        ref={wrapperRef}
        className={[styles.gridController, className].join(" ")}
      >
        <AnimationSequencer />

        <FluxelGrid
          ref={gridInstanceRef}
          gridData={gridData}
          viewableWidth={viewableWidth}
          viewableHeight={viewableHeight}
        />
      </div>
    );
  },
);

export default GridController;
