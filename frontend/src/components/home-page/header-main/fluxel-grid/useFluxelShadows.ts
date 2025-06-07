import { useEffect, useRef } from "react";
import { FluxelData } from "./FluxelAllTypes";
import type { FluxelGridHandle } from "./FluxelAllTypes";
import MiscUtils from "utils/MiscUtils";

function getShadowInfluence(
  { col, row }: { col: number; row: number },
  { x, y }: { x: number; y: number },
  fluxelSize: number,
  radiusMultiplier: number,
  smoothRangeMultiplier: number,
  smoothing: boolean,
) {
  const gridX = col * fluxelSize + fluxelSize / 2;
  const gridY = row * fluxelSize + fluxelSize / 2;

  const dx = gridX - x;
  const dy = gridY - y;
  const baseDistance = Math.sqrt(dx * dx + dy * dy);

  if (!smoothing) {
    return baseDistance < fluxelSize * radiusMultiplier ? 1 : 0;
  }

  const influence =
    1 -
    MiscUtils.smoothStep(0, fluxelSize * smoothRangeMultiplier, baseDistance);

  return baseDistance < fluxelSize * radiusMultiplier ? influence : 0;
}

/**
 * Creates the magnetic repulsion trailer effect on the fluxels.
 *
 * @author Bradley Baysinger
 * @since The beginning of time.
 * @version Refactored for internal pointer tracking + debounced resize + external FPS control
 */
export function useFluxelShadows({
  gridRef,
  setGridData,
  isPausedRef,
  fps = 20,
  radiusMultiplier = 5,
  smoothRangeMultiplier = 4.25,
  smoothing = true,
}: {
  gridRef: React.RefObject<FluxelGridHandle | null>;
  setGridData: React.Dispatch<React.SetStateAction<FluxelData[][]>>;
  isPausedRef?: React.RefObject<boolean>;
  fps?: number;
  radiusMultiplier?: number;
  smoothRangeMultiplier?: number;
  smoothing?: boolean;
}) {
  const containerRef = useRef<HTMLElement | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const lastUpdateTime = useRef(0);

  useEffect(() => {
    const container = gridRef.current?.getContainerElement?.();
    if (!container) return;
    containerRef.current = container;

    const intervalMs = 1000 / fps;

    const onPointerMove = (e: PointerEvent) => {
      const now = performance.now();
      if (now - lastUpdateTime.current < intervalMs) return;

      if (animationFrameId.current) return;

      animationFrameId.current = requestAnimationFrame(() => {
        animationFrameId.current = null;
        lastUpdateTime.current = now;

        const gridHandle = gridRef.current;
        const gridData = gridHandle?.getGridData?.();
        const container = containerRef.current;

        if (!gridData || !container) return;

        const cols = gridData[0]?.length || 1;
        const fluxelSize = container.clientWidth / cols;
        if (fluxelSize < 1) return;

        const rect = container.getBoundingClientRect();
        const pos = {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        };

        if (isPausedRef?.current) return;

        setGridData((prevGrid) => {
          let hasChanged = false;

          const updatedGrid = prevGrid.map((row) =>
            row.map((fluxel) => {
              let influence = 0;
              let shadowTrOffsetX = 0;
              let shadowTrOffsetY = 0;
              let shadowBlOffsetX = 0;
              let shadowBlOffsetY = 0;

              if (pos.x >= 0 && pos.y >= 0) {
                influence = getShadowInfluence(
                  { col: fluxel.col, row: fluxel.row },
                  pos,
                  fluxelSize,
                  radiusMultiplier,
                  smoothRangeMultiplier,
                  smoothing,
                );
                const top = getShadowInfluence(
                  { col: fluxel.col, row: fluxel.row - 1 },
                  pos,
                  fluxelSize,
                  radiusMultiplier,
                  smoothRangeMultiplier,
                  smoothing,
                );
                const right = getShadowInfluence(
                  { col: fluxel.col + 1, row: fluxel.row },
                  pos,
                  fluxelSize,
                  radiusMultiplier,
                  smoothRangeMultiplier,
                  smoothing,
                );
                const bottom = getShadowInfluence(
                  { col: fluxel.col, row: fluxel.row + 1 },
                  pos,
                  fluxelSize,
                  radiusMultiplier,
                  smoothRangeMultiplier,
                  smoothing,
                );
                const left = getShadowInfluence(
                  { col: fluxel.col - 1, row: fluxel.row },
                  pos,
                  fluxelSize,
                  radiusMultiplier,
                  smoothRangeMultiplier,
                  smoothing,
                );

                shadowTrOffsetX = Math.round(
                  Math.min(right - influence, 0) * 80,
                );
                shadowTrOffsetY = Math.round(Math.max(influence - top, 0) * 80);
                shadowBlOffsetX = Math.round(
                  Math.max(influence - left, 0) * 56,
                );
                shadowBlOffsetY = Math.round(
                  Math.min(bottom - influence, 0) * 56,
                );
              }

              const changed =
                Math.abs(influence - fluxel.influence) > 0.009 ||
                shadowTrOffsetX !== fluxel.shadowTrOffsetX ||
                shadowTrOffsetY !== fluxel.shadowTrOffsetY ||
                shadowBlOffsetX !== fluxel.shadowBlOffsetX ||
                shadowBlOffsetY !== fluxel.shadowBlOffsetY;

              if (changed) {
                hasChanged = true;
                return {
                  ...fluxel,
                  influence: +influence.toFixed(2),
                  shadowTrOffsetX,
                  shadowTrOffsetY,
                  shadowBlOffsetX,
                  shadowBlOffsetY,
                };
              }

              return fluxel;
            }),
          );

          return hasChanged ? updatedGrid : prevGrid;
        });
      });
    };

    window.addEventListener("pointermove", onPointerMove);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [
    gridRef,
    setGridData,
    isPausedRef,
    fps,
    radiusMultiplier,
    smoothRangeMultiplier,
    smoothing,
  ]);
}
