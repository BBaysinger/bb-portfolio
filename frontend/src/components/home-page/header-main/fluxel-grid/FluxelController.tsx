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
import type { FluxelGridHandle } from "./FluxelGrid"; // make sure to import this

import type { FluxelData } from "./Fluxel";

export interface FluxelControllerHandle {
  launchProjectile: (x: number, y: number, direction: Direction) => void;
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
    const [fluxelSize, setFluxelSize] = useState(0);

    /* ------------------------------------------------------------------ */
    /*  Shadow & projectile helpers                                       */
    /* ------------------------------------------------------------------ */
    const combinedMousePos = externalMousePos ?? mousePos;

    useFluxelShadows({
      gridRef: gridInstanceRef,
      fluxelSize: fluxelSize,
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

    const onGridChange = ({ fluxelSize }: { fluxelSize: number }) => {
      setFluxelSize(fluxelSize);
    };

    /* ------------------------------------------------------------------ */
    /*  Render                                                            */
    /* ------------------------------------------------------------------ */
    return (
      <FluxelGrid
        ref={gridInstanceRef}
        gridData={gridData}
        viewableWidth={viewableWidth}
        viewableHeight={viewableHeight}
        onGridChange={onGridChange}
      />
    );
  },
);

export default FluxelController;
