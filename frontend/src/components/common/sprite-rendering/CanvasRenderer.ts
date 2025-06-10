import { ISpriteRenderer } from "./RenderingAllTypes";

export class CanvasRenderer implements ISpriteRenderer {
  private ctx: CanvasRenderingContext2D;
  private image: HTMLImageElement;
  private isLoaded = false;

  private columns: number;

  constructor(
    private canvas: HTMLCanvasElement,
    imageSrc: string,
    private meta: {
      frameWidth: number;
      frameHeight: number;
      frameCount: number;
    },
  ) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas not supported");
    this.ctx = ctx;

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
    const dpr = window.devicePixelRatio || 1;
    const displayWidth = this.canvas.clientWidth * dpr;
    const displayHeight = this.canvas.clientHeight * dpr;

    if (
      this.canvas.width !== displayWidth ||
      this.canvas.height !== displayHeight
    ) {
      this.canvas.width = displayWidth;
      this.canvas.height = displayHeight;
    }
  }

  drawFrame(index: number) {
    if (!this.isLoaded) return;

    this.syncCanvasSizeToDisplay();

    const { frameWidth, frameHeight } = this.meta;
    const row = Math.floor(index / this.columns);
    const col = index % this.columns;

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

  dispose() {
    this.image.src = "";
    // Not strictly needed, but good hygiene:
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}
