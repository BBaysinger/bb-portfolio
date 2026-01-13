import { ISpriteRenderer } from "./RenderingAllTypes";

/**
 * Canvas-backed sprite renderer.
 *
 * Responsibilities:
 * - Loads a sprite sheet image and renders a selected frame onto an HTML canvas.
 * - Keeps frames crisp by disabling canvas image smoothing.
 * - Synchronizes the canvas backing resolution with CSS display size (DPR-aware).
 *
 * Key exports:
 * - `CanvasRenderer` – implements `ISpriteRenderer` for `<canvas>` rendering.
 */

type SpriteSheetMeta = {
  /** Source image frame width in pixels. */
  frameWidth: number;
  /** Source image frame height in pixels. */
  frameHeight: number;
  /** Total number of frames in the sprite sheet. */
  frameCount: number;
};

/**
 * Renders frames from a sprite sheet to a canvas.
 */
export class CanvasRenderer implements ISpriteRenderer {
  private ctx: CanvasRenderingContext2D;
  private image: HTMLImageElement;
  private isLoaded = false;

  private columns: number;

  constructor(
    private canvas: HTMLCanvasElement,
    imageSrc: string,
    private meta: SpriteSheetMeta,
  ) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas not supported");
    this.ctx = ctx;

    // Keep sprite frames crisp when the canvas is scaled.
    this.ctx.imageSmoothingEnabled = false;

    // Cap the per-row columns to avoid extremely wide source atlases.
    // 4096 is a practical upper bound for safe texture/canvas usage across devices.
    this.columns = Math.min(
      meta.frameCount,
      Math.floor(4096 / meta.frameWidth),
    );

    this.image = new Image();
    this.image.onload = () => {
      this.isLoaded = true;
      this.drawFrame(0); // optional initial render
    };
    this.image.src = imageSrc;
  }

  private syncCanvasSizeToDisplay() {
    // This renderer is client-only; guard in case it is constructed in a non-DOM context.
    if (typeof window === "undefined") return;

    const dpr = window.devicePixelRatio || 1;
    // Canvas backing store uses integer pixels; round to avoid fractional dimensions.
    const displayWidth = Math.max(1, Math.round(this.canvas.clientWidth * dpr));
    const displayHeight = Math.max(
      1,
      Math.round(this.canvas.clientHeight * dpr),
    );

    if (
      this.canvas.width !== displayWidth ||
      this.canvas.height !== displayHeight
    ) {
      this.canvas.width = displayWidth;
      this.canvas.height = displayHeight;

      // Resizing a canvas can reset context state in some browsers.
      this.ctx.imageSmoothingEnabled = false;
    }
  }

  /**
   * Draws a single frame from the sprite sheet.
   *
   * @param index - 0-based frame index.
   */
  drawFrame(index: number) {
    if (!this.isLoaded) return;
    if (!Number.isFinite(index)) return;
    const frameIndex = Math.floor(index);
    if (frameIndex < 0 || frameIndex >= this.meta.frameCount) return;

    this.syncCanvasSizeToDisplay();

    // Explicitly keep smoothing disabled before drawing.
    this.ctx.imageSmoothingEnabled = false;

    const { frameWidth, frameHeight } = this.meta;
    const row = Math.floor(frameIndex / this.columns);
    const col = frameIndex % this.columns;

    const sx = col * frameWidth;
    const sy = row * frameHeight;

    const dw = this.canvas.width;
    const dh = this.canvas.height;

    this.ctx.clearRect(0, 0, dw, dh);
    this.ctx.drawImage(
      this.image,
      sx,
      sy,
      frameWidth,
      frameHeight,
      0,
      0,
      dw,
      dh,
    );
  }

  /**
   * Best-effort cleanup for this renderer.
   *
   * Notes:
   * - Clears the canvas.
   * - Releases the image src reference to encourage GC.
   */
  dispose() {
    this.image.src = "";
    // Not strictly needed, but good hygiene:
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}
