export interface ISpriteRenderer {
  drawFrame(index: number): void;
  dispose(): void;
}

export type RenderStrategyType = "css" | "canvas" | "webgl";
