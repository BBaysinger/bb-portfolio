import type { Ref } from "react";

/**
 * Shared type definitions for the Fluxel grid system.
 *
 * This file centralizes the core interfaces used by all grid renderers
 * (SVG/canvas/Pixi) so controllers and effect hooks can remain renderer-agnostic.
 *
 * Key exports:
 * - {@link FluxelGridHandle} – imperative surface exposed by grid renderers.
 * - {@link FluxelGridProps} – common props accepted by grid renderers.
 * - {@link FluxelData} – per-cell state model used to drive visuals.
 * - {@link FluxelHandle} / {@link IFluxel} – per-fluxel imperative hooks.
 */

/** Payload emitted when a grid renderer recalculates its inferred cell size. */
export type FluxelGridChangeInfo = {
  rows: number;
  cols: number;
  fluxelSize: number;
};

export interface FluxelGridHandle {
  /**
   * Returns the fluxel under a client-coordinate point.
   *
   * @param x - Client X coordinate (e.g. `PointerEvent.clientX`).
   * @param y - Client Y coordinate (e.g. `PointerEvent.clientY`).
   */
  getFluxelAt: (x: number, y: number) => FluxelData | null;

  /** Returns the grid container element (or null if unmounted). */
  getContainerElement: () => HTMLDivElement | null;

  /** Returns the inferred rendered fluxel size in pixels. */
  getFluxelSize: () => number;

  /** Returns the latest grid data matrix used by this renderer. */
  getGridData: () => FluxelData[][];

  /**
   * Optional renderer-specific hook for external effects.
   *
   * Used by shadow/projectile systems to "poke" a fluxel at a known row/col
   * without requiring the caller to know which renderer is active.
   */
  trackPosition?: (
    row: number,
    col: number,
    influence: number,
    color?: string,
  ) => void;
}

export interface FluxelGridProps {
  /** Fluxel data matrix driving the rendered grid. */
  gridData: FluxelData[][];

  /** Optional external ref for the grid container element. */
  gridRef?: Ref<HTMLDivElement>;

  /**
   * Sizing is inferred internally from the rendered container element.
   * No explicit viewable width/height props are required.
   */
  onGridChange?: (info: FluxelGridChangeInfo) => void;

  /** Enables internal per-cell refs and imperative behaviors (default varies by renderer). */
  imperativeMode?: boolean;

  /** Optional class name applied to the renderer root element. */
  className?: string;

  /**
   * Optional registration hook used by controllers to request a layout recompute.
   * The renderer should call `updateFn` when it is safe to measure the DOM.
   */
  onLayoutUpdateRequest?: (updateFn: () => void) => void;
}

export interface FluxelData {
  /** Stable identifier for React keys and external lookup. */
  id: string;

  /** Grid row index (0-based). */
  row: number;

  /** Grid column index (0-based). */
  col: number;

  /** Influence magnitude applied by interactions/projectiles (interpretation is renderer-specific). */
  influence: number;

  /** Shadow offsets (top-right and bottom-left) used to simulate depth. */
  shadowTrOffsetX: number;
  shadowTrOffsetY: number;
  shadowBlOffsetX: number;
  shadowBlOffsetY: number;

  /** Optional per-cell color variation (e.g., CSS color string). */
  colorVariation?: string;
}

export interface FluxelHandle {
  /** Update this fluxel's influence (and optional color variation). */
  updateInfluence: (influence: number, colorVariation?: string) => void;
}

export interface IFluxel extends FluxelHandle {
  /** Update the per-fluxel shadow offsets used by depth rendering. */
  updateShadowOffsets: (tr: [number, number], bl: [number, number]) => void;
}
