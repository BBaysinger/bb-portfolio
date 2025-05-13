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
}

interface GridControllerProps {
  rows: number;
  cols: number;
  viewableHeight: number;
  viewableWidth: number;
  className?: string;
}

const FRAME_TIME = 1000 / 30;

/**
 * GridController
 *
 * Handles the grid and the effects we're applying to it.
 *
 * @author Bradley Baysinger
 * @since The beginning of time.
 * @version N/A
 */
const GridController = forwardRef<GridControllerHandle, GridControllerProps>(
  ({ rows, cols, viewableHeight, viewableWidth, className }, ref) => {
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
          shadowOffsetX: 0,
          shadowOffsetY: 0,
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

    useImperativeHandle(ref, () => ({ launchProjectile }), [launchProjectile]);

    /* ------------------------------------------------------------------ */
    /*  Pointer‑tracking effect                                           */
    /* ------------------------------------------------------------------ */
    const lastFrameTime = useRef(0);

    useEffect(() => {
      let target = window;

      if (!target) {
        throw new Error("❌ mouseMoveTargetRef.current is null");
      }

      const handleMove = (event: PointerEvent) => {
        const gridEl = gridInstanceRef.current?.getElement();
        if (!gridEl) return;

        const now = performance.now();
        if (now - lastFrameTime.current < FRAME_TIME) return;
        lastFrameTime.current = now;

        const rect = gridEl.getBoundingClientRect();
        const localX = event.clientX - rect.left;
        const localY = event.clientY - rect.top;

        mousePosRef.current = { x: localX, y: localY };
      };

      const clearPos = () => {
        mousePosRef.current = null;
      };

      target.addEventListener("pointermove", handleMove as EventListener);
      target.addEventListener("pointerleave", clearPos);

      return () => {
        target.removeEventListener("pointermove", handleMove as EventListener);
        target.removeEventListener("pointerleave", clearPos);
      };
    }, [viewableWidth, viewableHeight]);

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
