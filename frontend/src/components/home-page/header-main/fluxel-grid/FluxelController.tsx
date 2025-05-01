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
import styles from "./FluxelController.module.scss";

export interface FluxelControllerHandle {
  launchProjectile: (x: number, y: number, direction: Direction) => void;
}

interface FluxelControllerProps {
  rows: number;
  cols: number;
  viewableHeight: number;
  viewableWidth: number;
  /** Pointer position calculated by a parent component (optional) */
  externalMousePos?: { x: number; y: number } | null;
  /** Element you want the pointer listeners attached to (optional) */
  mouseMoveTargetRef?: React.RefObject<HTMLElement | null>;
  className?: string;
}

const FRAME_TIME = 1000 / 30;

/**
 * FluxelController
 *
 * Handles the grid and the effects we're applying to it.
 *
 * @author Bradley Baysinger
 * @since The beginning of time.
 * @version N/A
 */
const FluxelController = forwardRef<
  FluxelControllerHandle,
  FluxelControllerProps
>(
  (
    {
      rows,
      cols,
      viewableHeight,
      viewableWidth,
      externalMousePos,
      mouseMoveTargetRef,
      className,
    },
    ref,
  ) => {
    const gridInstanceRef = useRef<FluxelGridHandle>(null);

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
    const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(
      null,
    );

    /* ------------------------------------------------------------------ */
    /*  Shadow & projectile helpers                                       */
    /* ------------------------------------------------------------------ */
    const combinedMousePos = externalMousePos ?? mousePos;

    useFluxelShadows({
      gridRef: gridInstanceRef,
      setGridData,
      externalMousePos: combinedMousePos,
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

    // Detect touch‑only devices once (outside the effect).
    const isTouchDevice =
      typeof navigator !== "undefined" &&
      ("maxTouchPoints" in navigator
        ? navigator.maxTouchPoints > 0
        : "ontouchstart" in window);

    useEffect(() => {
      if (isTouchDevice) return;

      // Use the supplied target if it exists, otherwise fall back to `window`.
      const target: EventTarget = mouseMoveTargetRef?.current ?? window;

      const handleMove = (event: PointerEvent) => {
        const gridEl = gridInstanceRef.current?.getElement();
        if (!gridEl) return;

        const now = performance.now();
        if (now - lastFrameTime.current < FRAME_TIME) return;
        lastFrameTime.current = now;

        setMousePos({ x: event.clientX, y: event.clientY });
      };

      const clearPos = () => setMousePos(null);

      target.addEventListener("pointermove", handleMove as any);
      target.addEventListener("pointerleave", clearPos as any);

      return () => {
        target.removeEventListener("pointermove", handleMove as any);
        target.removeEventListener("pointerleave", clearPos as any);
      };
      // eslint‑disable‑next‑line react‑hooks/exhaustive‑deps
    }, [viewableWidth, viewableHeight, mouseMoveTargetRef?.current]);

    /* ------------------------------------------------------------------ */
    /*  Render                                                            */
    /* ------------------------------------------------------------------ */
    return (
      <div className={className}>
        <AnimationSequencer className={styles.fluxelGridBackground} />

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

export default FluxelController;
