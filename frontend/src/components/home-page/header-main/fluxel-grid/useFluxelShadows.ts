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
 * Custom hook for calculating directional shadow offsets and influence values
 * on a grid of Fluxels based on a pointer position.
 *
 * This creates a dynamic magnetic-repulsion-style shadow effect that follows the
 * pointer, using customizable smoothing and radius multipliers. When the pointer
 * leaves the grid (i.e., `mousePos` is null), all shadow values are cleared.
 *
 * The hook throttles updates internally using `fps`, while always consuming real-time
 * pointer data. Rendering logic runs in `requestAnimationFrame` to avoid layout thrashing.
 *
 * @param gridRef - Ref to the Fluxel grid instance providing layout and data access
 * @param setGridData - React state setter for updating the fluxel grid
 * @param mousePos - Current pointer position relative to the grid container, or null if inactive
 * @param isPausedRef - Optional ref to pause shadow updates
 * @param fps - Max frames per second to update shadow effects (default: 20)
 * @param radiusMultiplier - Radius for maximum influence effect range (default: 5)
 * @param smoothRangeMultiplier - Distance used for smooth influence dropoff (default: 4.25)
 * @param smoothing - Whether to apply smooth falloff instead of binary influence (default: true)
 *
 * @author Bradley Baysinger
 * @since The beginning of time.
 */
export function useFluxelShadows({
  gridRef,
  setGridData,
  mousePos,
  isPausedRef,
  fps = 20,
  radiusMultiplier = 5,
  smoothRangeMultiplier = 4.25,
  smoothing = true,
}: {
  gridRef: React.RefObject<FluxelGridHandle | null>;
  setGridData: React.Dispatch<React.SetStateAction<FluxelData[][]>>;
  mousePos: { x: number; y: number } | null;
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
    containerRef.current = gridRef.current?.getContainerElement?.() ?? null;
  }, [gridRef]);

  // Update grid on valid mousePos
  useEffect(() => {
    if (!mousePos || !containerRef.current || isPausedRef?.current) return;

    const now = performance.now();
    const intervalMs = 1000 / fps;
    if (now - lastUpdateTime.current < intervalMs) return;

    lastUpdateTime.current = now;

    if (animationFrameId.current !== null) return;
    animationFrameId.current = requestAnimationFrame(() => {
      animationFrameId.current = null;

      const gridHandle = gridRef.current;
      const gridData = gridHandle?.getGridData?.();
      const container = containerRef.current;
      if (!gridData || !container) return;

      const cols = gridData[0]?.length || 1;
      const fluxelSize = container.clientWidth / cols;
      if (fluxelSize < 1) return;

      setGridData((prevGrid) => {
        let hasChanged = false;

        const updatedGrid = prevGrid.map((row) =>
          row.map((fluxel) => {
            let influence = 0;
            let shadowTrOffsetX = 0;
            let shadowTrOffsetY = 0;
            let shadowBlOffsetX = 0;
            let shadowBlOffsetY = 0;

            if (mousePos.x >= 0 && mousePos.y >= 0) {
              influence = getShadowInfluence(
                { col: fluxel.col, row: fluxel.row },
                mousePos,
                fluxelSize,
                radiusMultiplier,
                smoothRangeMultiplier,
                smoothing,
              );

              const top = getShadowInfluence(
                { col: fluxel.col, row: fluxel.row - 1 },
                mousePos,
                fluxelSize,
                radiusMultiplier,
                smoothRangeMultiplier,
                smoothing,
              );
              const right = getShadowInfluence(
                { col: fluxel.col + 1, row: fluxel.row },
                mousePos,
                fluxelSize,
                radiusMultiplier,
                smoothRangeMultiplier,
                smoothing,
              );
              const bottom = getShadowInfluence(
                { col: fluxel.col, row: fluxel.row + 1 },
                mousePos,
                fluxelSize,
                radiusMultiplier,
                smoothRangeMultiplier,
                smoothing,
              );
              const left = getShadowInfluence(
                { col: fluxel.col - 1, row: fluxel.row },
                mousePos,
                fluxelSize,
                radiusMultiplier,
                smoothRangeMultiplier,
                smoothing,
              );

              shadowTrOffsetX = Math.round(Math.min(right - influence, 0) * 80);
              shadowTrOffsetY = Math.round(Math.max(influence - top, 0) * 80);
              shadowBlOffsetX = Math.round(Math.max(influence - left, 0) * 56);
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
  }, [
    mousePos,
    gridRef,
    setGridData,
    isPausedRef,
    fps,
    radiusMultiplier,
    smoothRangeMultiplier,
    smoothing,
  ]);

  // Clear shadows when pointer leaves (mousePos becomes null)
  useEffect(() => {
    if (mousePos !== null) return;

    // Cancel any pending frame update to avoid re-applying shadows
    if (animationFrameId.current !== null) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }

    setGridData((prevGrid) =>
      prevGrid.map((row) =>
        row.map((fluxel) => {
          if (
            fluxel.influence === 0 &&
            fluxel.shadowTrOffsetX === 0 &&
            fluxel.shadowTrOffsetY === 0 &&
            fluxel.shadowBlOffsetX === 0 &&
            fluxel.shadowBlOffsetY === 0
          ) {
            return fluxel;
          }

          return {
            ...fluxel,
            influence: 0,
            shadowTrOffsetX: 0,
            shadowTrOffsetY: 0,
            shadowBlOffsetX: 0,
            shadowBlOffsetY: 0,
          };
        }),
      ),
    );
  }, [mousePos, setGridData]);
}
