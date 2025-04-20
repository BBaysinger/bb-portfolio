import {
  useState,
  useRef,
  useImperativeHandle,
  forwardRef,
  useEffect,
} from "react";
import FluxelGrid from "./FluxelGrid";
import { useFluxelShadows } from "./useFluxelShadows";
import useFluxelProjectiles from "./useFluxelProjectiles";
import type { FluxelData } from "./Fluxel";

export type Direction = "up" | "down" | "left" | "right";

export interface FluxelControllerHandle {
  launchProjectile: (row: number, col: number, direction: Direction) => void;
}

interface Props {
  rows: number;
  cols: number;
  viewableHeight: number;
  viewableWidth: number;
  /** Pointer position calculated by a parent component (optional) */
  externalMousePos?: { x: number; y: number } | null;
  /** Element you want the pointer listeners attached to (optional) */
  mouseMoveTargetRef?: React.RefObject<HTMLElement | null>;
}

const FRAME_TIME = 1000 / 30;

/**
 * FluxelController
 *
 * @author Bradley Baysinger
 * @since The beginning of time.
 * @version N/A
 */
const FluxelController = forwardRef<FluxelControllerHandle, Props>(
  (
    {
      rows,
      cols,
      viewableHeight,
      viewableWidth,
      externalMousePos,
      mouseMoveTargetRef,
    },
    ref,
  ) => {
    /* ------------------------------------------------------------------ */
    /*  Grid state                                                        */
    /* ------------------------------------------------------------------ */
    const [grid, setGrid] = useState<FluxelData[][]>(() =>
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

    const gridRef = useRef<HTMLDivElement>(null);

    /* ------------------------------------------------------------------ */
    /*  Shadow & projectile helpers                                       */
    /* ------------------------------------------------------------------ */
    const combinedMousePos = externalMousePos ?? mousePos;

    useFluxelShadows({
      gridRef,
      fluxelSize: viewableWidth / cols,
      setGrid,
      externalMousePos: combinedMousePos,
      viewableWidth,
      viewableHeight,
    });

    const launchProjectile = useFluxelProjectiles({ grid, setGrid });

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
        if (!gridRef.current) return;

        const { left, top, width, height } =
          gridRef.current.getBoundingClientRect();

        const effectiveLeft = left + (width - viewableWidth) / 2;
        const effectiveTop = top + (height - viewableHeight) / 2;
        const effectiveRight = effectiveLeft + viewableWidth;
        const effectiveBottom = effectiveTop + viewableHeight;

        if (
          event.clientX < effectiveLeft ||
          event.clientX > effectiveRight ||
          event.clientY < effectiveTop ||
          event.clientY > effectiveBottom
        ) {
          setMousePos(null);
          return;
        }

        const now = performance.now();
        if (now - lastFrameTime.current < FRAME_TIME) return;
        lastFrameTime.current = now;

        setMousePos({ x: event.clientX - left, y: event.clientY - top });
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
      <FluxelGrid
        grid={grid}
        gridRef={gridRef}
        viewableWidth={viewableWidth}
        viewableHeight={viewableHeight}
      />
    );
  },
);

export default FluxelController;
