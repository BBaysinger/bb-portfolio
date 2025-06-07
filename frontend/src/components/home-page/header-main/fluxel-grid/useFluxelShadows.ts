import { useEffect, useRef } from "react";

import { FluxelData } from "./FluxelAllTypes";
import type { FluxelGridHandle } from "./FluxelAllTypes";
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

    const startLoop = (() => {
      let retryCount = 0;
      const maxRetries = 300; // e.g. ~5s at 60fps

      return function startLoopInner() {
        const gridHandle = gridRef.current;
        const fluxelSize = gridHandle?.getFluxelSize?.();
        const gridEl = gridHandle?.getContainerElement?.();

        const isReady = !!gridHandle && !!fluxelSize && !!gridEl;

        // const fluxelSize = gridHandle?.getFluxelSize?.();
        if (process.env.NODE_ENV === "development") {
          console.info("🧪 fluxelSize returned:", fluxelSize);
        }
        if (!isReady || isCancelled) {
          if (retryCount < maxRetries) {
            if (
              process.env.NODE_ENV === "development" &&
              retryCount % 10 === 0
            ) {
              // console.info("⏳ Waiting for grid to be ready...", {
              //   gridRefReady: !!gridHandle,
              //   containerReady: !!gridEl,
              //   fluxelSizeReady: !!fluxelSize,
              // });
            }
            retryCount++;
            animationFrameId.current = requestAnimationFrame(startLoopInner);
          } else {
            console.warn("⚠️ Timed out waiting for grid readiness.");
          }
          return;
        }

        console.info("✅ Grid ready. Starting shadow update loop.");
        retryCount = 0; // reset for future mounts

        const updateShadows = () => {
          if (isPausedRef?.current) {
            animationFrameId.current = requestAnimationFrame(updateShadows);
            return;
          }

          const pos = mousePosRef.current ?? { x: -99999, y: -99999 };

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
                    fluxelSize!,
                  );
                  const topInfluence = getShadowInfluence(
                    { col: fluxel.col, row: fluxel.row - 1 },
                    pos,
                    fluxelSize!,
                  );
                  const rightInfluence = getShadowInfluence(
                    { col: fluxel.col + 1, row: fluxel.row },
                    pos,
                    fluxelSize!,
                  );
                  const bottomInfluence = getShadowInfluence(
                    { col: fluxel.col, row: fluxel.row + 1 },
                    pos,
                    fluxelSize!,
                  );
                  const leftInfluence = getShadowInfluence(
                    { col: fluxel.col - 1, row: fluxel.row },
                    pos,
                    fluxelSize!,
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

          if (!isCancelled) {
            animationFrameId.current = requestAnimationFrame(updateShadows);
          }
        };

        animationFrameId.current = requestAnimationFrame(updateShadows);
      };
    })();

    startLoop();

    return () => {
      isCancelled = true;
      if (animationFrameId.current)
        cancelAnimationFrame(animationFrameId.current);
    };
  }, [gridRef, mousePosRef, setGridData]);
}
