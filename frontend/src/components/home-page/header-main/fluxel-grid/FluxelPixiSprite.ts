import { Container, Graphics, Color, Sprite, Texture } from "pixi.js";
import { FluxelPixiShadowFilter } from "./FluxelPixiShadowFilter";
import type { FluxelData } from "./FluxelAllTypes";

/**
 * Pixi.js Fluxel (fluxing pixel)
 *
 * @author Bradley Baysinger
 * @since The beginning of time.
 * @version N/A
 */
export class FluxelPixiSprite {
  container: Container;
  private bg: Graphics;
  private overlay?: Graphics;
  private shadowFilter: FluxelPixiShadowFilter;
  private shadowSprite: Sprite;
  private outline: number = 0x141414;

  constructor(data: FluxelData, size: number) {
    this.container = new Container();
    this.container.x = data.col * size;
    this.container.y = data.row * size;

    // Shadow rendering via shader
    const blank = Texture.WHITE;
    this.shadowSprite = new Sprite(blank);
    this.shadowSprite.width = size;
    this.shadowSprite.height = size;
    this.shadowFilter = new FluxelPixiShadowFilter(size);
    this.shadowSprite.filters = [this.shadowFilter];
    this.container.addChild(this.shadowSprite);

    // Background rectangle
    this.bg = new Graphics();
    this.bg.fill({
      color: 0x141414,
      alpha: Math.max(0, Math.min(1, data.influence * 1.0 - 0.1)),
    });
    this.bg.rect(0, 0, size, size);
    if (this.outline) {
      this.bg.stroke({ color: this.outline, width: 1 });
      this.bg.rect(0, 0, size, size);
    }
    this.container.addChild(this.bg);

    if (data.colorVariation) {
      this.overlay = new Graphics();
      this.overlay.fill({ color: new Color(data.colorVariation).toNumber() });
      this.overlay.rect(0, 0, size, size);
      this.container.addChild(this.overlay);
    }

    this.updateShadows(data);
  }

  updateInfluence(influence: number, colorVariation?: string) {
    const size = this.bg.width;
    this.bg.clear();
    this.bg.fill({
      color: 0x141414,
      alpha: Math.max(0, Math.min(1, influence * 1.0 - 0.1)),
    });
    this.bg.rect(0, 0, size, size);
    if (this.outline) {
      this.bg.stroke({ color: this.outline, width: 1 });
      this.bg.rect(0, 0, size, size);
    }

    if (colorVariation && this.overlay) {
      this.overlay.clear();
      this.overlay.fill({ color: new Color(colorVariation).toNumber() });
      this.overlay.rect(0, 0, size, size);
    }
  }

  updateShadows(data: FluxelData) {
    this.shadowFilter.setShadowOffsets(
      [data.shadowTrOffsetX, data.shadowTrOffsetY],
      [data.shadowBlOffsetX, data.shadowBlOffsetY],
    );
  }
}
