import { ISpriteRenderer } from "./RenderingAllTypes";

/**
 * CSS sprite renderer.
 *
 * Uses a DOM element with a `background-image` sprite sheet and advances frames by
 * updating `background-position`. This keeps rendering simple and avoids canvas/WebGL
 * setup costs, at the expense of relying on browser image decode/paint timing.
 *
 * Key exports:
 * - `CssRenderer` – implements `ISpriteRenderer` for CSS background rendering.
 */
export class CssRenderer implements ISpriteRenderer {
  private columns: number;
  private framePositions: string[];
  private lastFrameIndex: number | null = null;
  private isHidden = false;

  constructor(
    private element: HTMLElement,
    private imageSrc: string,
    private meta: {
      frameWidth: number;
      frameHeight: number;
      frameCount: number;
    },
  ) {
    // Cap the per-row columns to avoid extremely wide atlases.
    this.columns = Math.min(
      meta.frameCount,
      Math.floor(4096 / meta.frameWidth),
    );

    const totalCols = this.columns;
    const totalRows = Math.ceil(meta.frameCount / totalCols);
    this.framePositions = Array.from(
      { length: meta.frameCount },
      (_, index) => {
        const col = index % totalCols;
        const row = Math.floor(index / totalCols);
        const x = (col / (totalCols - 1 || 1)) * 100;
        const y = (row / (totalRows - 1 || 1)) * 100;
        return `${x}% ${y}%`;
      },
    );

    // Static style baseline. Dynamic values (frame) are set in `drawFrame`.
    this.element.style.backgroundImage = `url(${this.imageSrc})`;
    this.element.style.backgroundRepeat = "no-repeat";
    this.element.style.backgroundSize = `${this.columns * 100}% ${
      Math.ceil(meta.frameCount / this.columns) * 100
    }%`;
    // Crisp pixels for sprite sheets.
    this.element.style.imageRendering = "pixelated";
  }

  /**
   * Draw a single frame by index.
   *
   * @param index - 0-based frame index. Passing `-1` hides the sprite visually while
   * keeping the background image referenced (useful for warm-loading).
   */
  drawFrame(index: number): void {
    if (!Number.isFinite(index)) return;
    const frameIndex = Math.floor(index);

    // Special case: hide sprite without releasing the URL reference.
    if (frameIndex === -1) {
      if (this.isHidden) return;
      this.isHidden = true;
      this.lastFrameIndex = null;
      this.element.style.backgroundPosition = "-99999px -99999px";
      return;
    }

    if (frameIndex < 0 || frameIndex >= this.meta.frameCount) return;
    if (!this.isHidden && this.lastFrameIndex === frameIndex) return;

    this.isHidden = false;
    this.lastFrameIndex = frameIndex;
    this.element.style.backgroundPosition = this.framePositions[frameIndex];
  }

  /**
   * Best-effort cleanup.
   *
   * Note: we only clear dynamic background styles we set.
   */
  dispose(): void {
    this.lastFrameIndex = null;
    this.isHidden = false;
    this.element.style.backgroundImage = "";
    this.element.style.backgroundPosition = "";
    this.element.style.backgroundSize = "";
    this.element.style.backgroundRepeat = "";
  }
}
