import { useEffect, useRef } from "react";

import { FluxelData } from "./Fluxel";
import type { FluxelGridHandle } from "./FluxelGrid";
import { globalToLocal } from "utils/globalToLocal";

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

/**
 * Creates the magnetic repulsion trailer effect on the fluxels.
 */
export function useFluxelShadows({
  gridRef,
  setGridData,
  externalMousePos,
}: {
  gridRef: React.RefObject<FluxelGridHandle | null>;
  setGridData: React.Dispatch<React.SetStateAction<FluxelData[][]>>;
  externalMousePos?: { x: number; y: number } | null;
}) {
  const animationFrameId = useRef<number | null>(null);

  useEffect(() => {
    const gridEl = gridRef.current?.getElement();
    const fluxelSize = gridRef.current?.getFluxelSize();
    if (!gridEl || !fluxelSize) return;

    const pos = externalMousePos
      ? globalToLocal(gridEl, externalMousePos.x, externalMousePos.y)
      : { x: -100000, y: -100000 };

    if (animationFrameId.current)
      cancelAnimationFrame(animationFrameId.current);

    animationFrameId.current = requestAnimationFrame(() => {
      setGridData((prevGrid) => {
        let hasChanged = false;

        const updatedGrid = prevGrid.map((row) =>
          row.map((fluxel) => {
            let influence = 0;
            let shadowOffsetX = 0;
            let shadowOffsetY = 0;

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
  }, [externalMousePos, gridRef]);
}
