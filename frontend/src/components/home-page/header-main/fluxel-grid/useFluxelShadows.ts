import { useEffect, useRef } from "react";

import { FluxelData } from "./Fluxel";
import type { FluxelGridHandle } from "./FluxelGridTypes";
import MiscUtils from "utils/MiscUtils";

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
  const influence =
    1 - MiscUtils.smoothStep(0, fluxelSize * 4.25, baseDistance);

  return baseDistance < fluxelSize * 5 ? influence : 0;
}

/**
 * Creates the magnetic repulsion trailer effect on the fluxels.
 *
 * @author Bradley Baysinger
 * @since The beginning of time.
 * @version N/A
 */
export function useFluxelShadows({
  gridRef,
  setGridData,
  mousePosRef,
  isPausedRef,
}: {
  gridRef: React.RefObject<FluxelGridHandle | null>;
  setGridData: React.Dispatch<React.SetStateAction<FluxelData[][]>>;
  mousePosRef: React.RefObject<{ x: number; y: number } | null>;
  isPausedRef?: React.RefObject<boolean>;
}) {
  const animationFrameId = useRef<number | null>(null);

  useEffect(() => {
    let isCancelled = false;

    const startLoop = () => {
      const gridEl = gridRef.current?.getContainerElement();
      const fluxelSize = gridRef.current?.getFluxelSize();
      if (!gridEl || !fluxelSize || isCancelled) {
        // Try again on next frame
        animationFrameId.current = requestAnimationFrame(startLoop);
        return;
      }

      const updateShadows = () => {
        if (isPausedRef?.current) {
          animationFrameId.current = requestAnimationFrame(updateShadows);
          return;
        }
        const gridEl = gridRef.current?.getContainerElement();
        const fluxelSize = gridRef.current?.getFluxelSize();
        if (!gridEl || !fluxelSize) return;

        const pos = mousePosRef.current ?? { x: -99999, y: -99999 };

        setGridData((prevGrid) => {
          let hasChanged = false;

          const updatedGrid = prevGrid.map((row) =>
            row.map((fluxel) => {
              let influence = 0;
              let shadow1OffsetX = 0;
              let shadow1OffsetY = 0;
              let shadow2OffsetX = 0;
              let shadow2OffsetY = 0;

              if (pos.x >= 0 && pos.y >= 0) {
                influence = getShadowInfluence(
                  { col: fluxel.col, row: fluxel.row },
                  pos,
                  fluxelSize,
                );
                const topInfluence = getShadowInfluence(
                  { col: fluxel.col, row: fluxel.row - 1 },
                  pos,
                  fluxelSize,
                );
                const rightInfluence = getShadowInfluence(
                  { col: fluxel.col + 1, row: fluxel.row },
                  pos,
                  fluxelSize,
                );
                const bottomInfluence = getShadowInfluence(
                  { col: fluxel.col, row: fluxel.row + 1 },
                  pos,
                  fluxelSize,
                );
                const leftInfluence = getShadowInfluence(
                  { col: fluxel.col - 1, row: fluxel.row },
                  pos,
                  fluxelSize,
                );

                shadow1OffsetX = Math.round(
                  Math.min(rightInfluence - influence, 0) * 80,
                );
                shadow1OffsetY = Math.round(
                  Math.max(influence - topInfluence, 0) * 80,
                );
                shadow2OffsetX = Math.round(
                  Math.max(influence - leftInfluence, 0) * 56,
                );
                shadow2OffsetY = Math.round(
                  Math.min(bottomInfluence - influence, 0) * 56,
                );
              }

              if (
                Math.abs(influence - fluxel.influence) > 0.009 ||
                shadow1OffsetX !== fluxel.shadow1OffsetX ||
                shadow1OffsetY !== fluxel.shadow1OffsetY ||
                shadow2OffsetX !== fluxel.shadow2OffsetX ||
                shadow2OffsetY !== fluxel.shadow2OffsetY
              ) {
                hasChanged = true;
                return {
                  ...fluxel,
                  influence: +influence.toFixed(2),
                  shadow1OffsetX,
                  shadow1OffsetY,
                  shadow2OffsetX,
                  shadow2OffsetY,
                };
              }

              return fluxel;
            }),
          );

          return hasChanged ? updatedGrid : prevGrid;
        });

        if (!isCancelled) {
          animationFrameId.current = requestAnimationFrame(updateShadows);
        }
      };
      animationFrameId.current = requestAnimationFrame(updateShadows);
    };

    startLoop();

    return () => {
      isCancelled = true;
      if (animationFrameId.current)
        cancelAnimationFrame(animationFrameId.current);
    };
  }, [gridRef, mousePosRef, setGridData]);
}
