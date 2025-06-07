import { useEffect, useRef } from "react";

import { FluxelData } from "./FluxelAllTypes";
import type { FluxelGridHandle } from "./FluxelAllTypes";
import MiscUtils from "utils/MiscUtils";
import { useElementRelativeMouse } from "hooks/useElementRelativeMouse";

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
  const animationFrameId = useRef<number | null>(null);
  const containerRef = useRef<HTMLElement>(document.createElement("div"));
  const lastTimestampRef = useRef(0);

  useEffect(() => {
    const gridHandle = gridRef.current;
    const el = gridHandle?.getContainerElement?.();
    if (el) containerRef.current = el;
  }, [gridRef]);

  const internalMousePos = useElementRelativeMouse(containerRef);

  useEffect(() => {
    let isCancelled = false;
    const intervalMs = 1000 / fps;

    const loop = (timestamp: number) => {
      if (isCancelled) return;

      const elapsed = timestamp - lastTimestampRef.current;
      if (elapsed < intervalMs) {
        animationFrameId.current = requestAnimationFrame(loop);
        return;
      }
      lastTimestampRef.current = timestamp;

      const gridHandle = gridRef.current;
      const gridData = gridHandle?.getGridData?.();
      const container = containerRef.current;

      const cols = gridData?.[0]?.length || 1;
      const fluxelSize = container ? container.clientWidth / cols : 0;

      if (!gridData || !fluxelSize || fluxelSize < 1) {
        animationFrameId.current = requestAnimationFrame(loop);
        return;
      }

      const pos = internalMousePos.current ?? { x: -99999, y: -99999 };

      if (!isPausedRef?.current) {
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
                const topInfluence = getShadowInfluence(
                  { col: fluxel.col, row: fluxel.row - 1 },
                  pos,
                  fluxelSize,
                  radiusMultiplier,
                  smoothRangeMultiplier,
                  smoothing,
                );
                const rightInfluence = getShadowInfluence(
                  { col: fluxel.col + 1, row: fluxel.row },
                  pos,
                  fluxelSize,
                  radiusMultiplier,
                  smoothRangeMultiplier,
                  smoothing,
                );
                const bottomInfluence = getShadowInfluence(
                  { col: fluxel.col, row: fluxel.row + 1 },
                  pos,
                  fluxelSize,
                  radiusMultiplier,
                  smoothRangeMultiplier,
                  smoothing,
                );
                const leftInfluence = getShadowInfluence(
                  { col: fluxel.col - 1, row: fluxel.row },
                  pos,
                  fluxelSize,
                  radiusMultiplier,
                  smoothRangeMultiplier,
                  smoothing,
                );

                shadowTrOffsetX = Math.round(
                  Math.min(rightInfluence - influence, 0) * 80,
                );
                shadowTrOffsetY = Math.round(
                  Math.max(influence - topInfluence, 0) * 80,
                );
                shadowBlOffsetX = Math.round(
                  Math.max(influence - leftInfluence, 0) * 56,
                );
                shadowBlOffsetY = Math.round(
                  Math.min(bottomInfluence - influence, 0) * 56,
                );
              }

              if (
                Math.abs(influence - fluxel.influence) > 0.009 ||
                shadowTrOffsetX !== fluxel.shadowTrOffsetX ||
                shadowTrOffsetY !== fluxel.shadowTrOffsetY ||
                shadowBlOffsetX !== fluxel.shadowBlOffsetX ||
                shadowBlOffsetY !== fluxel.shadowBlOffsetY
              ) {
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
      }

      animationFrameId.current = requestAnimationFrame(loop);
    };

    animationFrameId.current = requestAnimationFrame(loop);

    return () => {
      isCancelled = true;
      if (animationFrameId.current)
        cancelAnimationFrame(animationFrameId.current);
    };
  }, [
    gridRef,
    setGridData,
    isPausedRef,
    internalMousePos,
    fps,
    radiusMultiplier,
    smoothRangeMultiplier,
    smoothing,
  ]);
}
