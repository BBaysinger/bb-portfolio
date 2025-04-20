import { useEffect, useRef, useState } from "react";
import { FluxelData } from "./Fluxel";

const FRAME_TIME = 1000 / 30;

const smoothStep = (edge0: number, edge1: number, x: number) => {
  let t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

function getShadowInfluence(
  { col, row }: { col: number; row: number },
  { x, y }: { x: number; y: number },
  fluxelSize: number,
) {
  const gridX = col * fluxelSize + fluxelSize / 2;
  const gridY = row * fluxelSize + fluxelSize / 2;
  const dx = gridX - x;
  const dy = gridY - y;
  const baseDistance = Math.sqrt(dx * dx + dy * dy);
  const influence = 1 - smoothStep(0, fluxelSize * 3.5, baseDistance);
  return baseDistance < fluxelSize * 4 ? influence : 0;
}

export function useFluxelShadows({
  gridRef,
  fluxelSize,
  setGrid,
  viewableWidth,
  viewableHeight,
  externalMousePos,
}: {
  gridRef: React.RefObject<HTMLDivElement | null>;
  fluxelSize: number;
  setGrid: React.Dispatch<React.SetStateAction<FluxelData[][]>>;
  viewableWidth: number;
  viewableHeight: number;
  externalMousePos?: { x: number; y: number } | null;
}) {
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(
    null,
  );
  const animationFrameId = useRef<number | null>(null);
  const lastFrameTime = useRef(0);

  // Detect touch-only devices
  const isTouchDevice =
    typeof navigator !== "undefined" &&
    ("maxTouchPoints" in navigator
      ? navigator.maxTouchPoints > 0
      : "ontouchstart" in window);

  useEffect(() => {
    // Bail out entirely on touch devices, because the effect only
    // occurs from dragging the slinger. That's strategic, to prevent
    // the default touch interaction, which is to scroll the page.
    // (The slinger was originally introduced as a way to enable the
    // fluxel shadows without scrolling the page.)
    if (isTouchDevice) return;

    const handleMove = (event: PointerEvent) => {
      // console.log(viewableWidth, viewableHeight);

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

    window.addEventListener("pointermove", handleMove);
    document.addEventListener("mouseleave", clearPos);
    gridRef.current?.addEventListener("touchend", clearPos);

    return () => {
      window.removeEventListener("pointermove", handleMove);
      document.removeEventListener("mouseleave", clearPos);
      gridRef.current?.removeEventListener("touchend", clearPos);
    };
  }, [viewableWidth, viewableHeight]);

  useEffect(() => {
    if (!gridRef.current || !fluxelSize) return;

    const effectiveMousePos = externalMousePos ||
      mousePos || {
        x: -10000,
        y: -10000,
      };

    if (animationFrameId.current)
      cancelAnimationFrame(animationFrameId.current);

    animationFrameId.current = requestAnimationFrame(() => {
      setGrid((prevGrid) => {
        let hasChanged = false;

        const updatedGrid = prevGrid.map((row) =>
          row.map((fluxel) => {
            let influence = 0;
            let shadowOffsetX = 0;
            let shadowOffsetY = 0;

            if (effectiveMousePos.x >= 0 && effectiveMousePos.y >= 0) {
              influence = getShadowInfluence(
                { col: fluxel.col, row: fluxel.row },
                effectiveMousePos,
                fluxelSize,
              );
              const topInfluence = getShadowInfluence(
                { col: fluxel.col, row: fluxel.row - 1 },
                effectiveMousePos,
                fluxelSize,
              );
              const rightInfluence = getShadowInfluence(
                { col: fluxel.col + 1, row: fluxel.row },
                effectiveMousePos,
                fluxelSize,
              );

              shadowOffsetX = Math.round(
                Math.min(rightInfluence - influence, 0) * 60,
              );
              shadowOffsetY = Math.round(
                Math.max(influence - topInfluence, 0) * 60,
              );
            }

            if (
              Math.abs(influence - fluxel.influence) > 0.009 ||
              shadowOffsetX !== fluxel.shadowOffsetX ||
              shadowOffsetY !== fluxel.shadowOffsetY
            ) {
              hasChanged = true;
              return {
                ...fluxel,
                influence: +influence.toFixed(2),
                shadowOffsetX,
                shadowOffsetY,
              };
            }

            return fluxel;
          }),
        );

        return hasChanged ? updatedGrid : prevGrid;
      });
    });

    return () => {
      if (animationFrameId.current)
        cancelAnimationFrame(animationFrameId.current);
    };
  }, [mousePos, externalMousePos, fluxelSize]);
}
