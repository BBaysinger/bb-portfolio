import React from "react";

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
  /**
   * Viewport sizing is inferred internally via useResponsiveScaler (svw/svh semantics).
   * No explicit viewable width/height props are required.
   */
  onGridChange?: (info: {
    rows: number;
    cols: number;
    fluxelSize: number;
  }) => void;
  imperativeMode?: boolean;
  className?: string;
  onLayoutUpdateRequest?: (updateFn: () => void) => void;
}

export interface FluxelData {
  id: string;
  row: number;
  col: number;
  influence: number;
  shadowTrOffsetX: number;
  shadowTrOffsetY: number;
  shadowBlOffsetX: number;
  shadowBlOffsetY: number;
  colorVariation?: string;
}

export interface FluxelHandle {
  updateInfluence: (influence: number, colorVariation?: string) => void;
}

export interface IFluxel extends FluxelHandle {
  updateShadowOffsets: (tr: [number, number], bl: [number, number]) => void;
}
