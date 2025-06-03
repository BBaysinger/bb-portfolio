import React from "react";
import { FluxelData } from "./Fluxel";

export interface FluxelGridHandle {
  getFluxelAt: (x: number, y: number) => FluxelData | null;
  getContainerElement: () => HTMLDivElement | null;
  getFluxelSize: () => number;
  getGridData: () => FluxelData[][];
  trackPosition?: (
    row: number,
    col: number,
    influence: number,
    color?: string,
  ) => void;
}

export interface FluxelGridProps {
  gridData: FluxelData[][];
  gridRef?: React.Ref<HTMLDivElement>;
  viewableHeight: number;
  viewableWidth: number;
  onGridChange?: (info: {
    rows: number;
    cols: number;
    fluxelSize: number;
  }) => void;
  imperativeMode?: boolean;
}
