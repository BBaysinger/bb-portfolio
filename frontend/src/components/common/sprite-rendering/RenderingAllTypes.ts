/**
 * Shared sprite rendering types.
 *
 * This file centralizes the minimal contracts used by different sprite renderers
 * (e.g., CSS-based, Canvas-based, WebGL-based) so callers can be agnostic to the
 * underlying implementation.
 *
 * Key exports:
 * - `ISpriteRenderer` – minimal renderer lifecycle contract.
 * - `RenderStrategyType` – supported renderer selection values.
 */

/**
 * Minimal sprite renderer contract.
 *
 * Notes:
 * - Implementations are expected to be imperative and side-effectful.
 * - `dispose()` should be safe to call during unmount/cleanup.
 */
export interface ISpriteRenderer {
  /** Draw a single frame by 0-based index. */
  drawFrame(index: number): void;

  /** Release resources and detach any listeners associated with the renderer. */
  dispose(): void;
}

/**
 * Supported sprite rendering strategies.
 *
 * - `css` – render via DOM/CSS (e.g., background-position).
 * - `canvas` – render via `<canvas>` 2D context.
 * - `webgl` – render via WebGL for high-performance/advanced effects.
 */
export type RenderStrategyType = "css" | "canvas" | "webgl";
