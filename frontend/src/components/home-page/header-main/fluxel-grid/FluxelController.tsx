import { useState, useRef, useImperativeHandle, forwardRef } from "react";
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
  externalMousePos?: { x: number; y: number } | null;
}

/**
 * FluxelController
 *
 * @author Bradley Baysinger
 * @since The beginning of time.
 * @version N/A
 */
const FluxelController = forwardRef<FluxelControllerHandle, Props>(
  ({ rows, cols, viewableHeight, viewableWidth, externalMousePos }, ref) => {
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

    const gridRef = useRef<HTMLDivElement>(null);

    useFluxelShadows({
      gridRef,
      fluxelSize: viewableWidth / cols,
      setGrid,
      externalMousePos,
      viewableWidth,
      viewableHeight,
    });

    const launchProjectile = useFluxelProjectiles({
      grid,
      setGrid,
    });

    useImperativeHandle(ref, () => ({
      launchProjectile,
    }));

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
