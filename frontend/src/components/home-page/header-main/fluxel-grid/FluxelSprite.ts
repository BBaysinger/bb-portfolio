import { Container, Graphics, Sprite, Texture, Color } from "pixi.js";

export interface FluxelData {
  id: string;
  row: number;
  col: number;
  influence: number;
  shadow1OffsetX: number;
  shadow1OffsetY: number;
  shadow2OffsetX: number;
  shadow2OffsetY: number;
  colorVariation?: string;
}

export class FluxelSprite {
  container: Container;
  private bg: Graphics;
  private overlay?: Graphics;
  private shadow1: Sprite;
  private shadow2: Sprite;

  constructor(data: FluxelData, size: number, cornerShadow: Texture) {
    this.container = new Container();
    this.container.x = data.col * size;
    this.container.y = data.row * size;

    this.bg = new Graphics();
    this.bg.fill({
      color: 0x141414,
      alpha: Math.max(0, Math.min(1, data.influence * 1.0 - 0.1)),
    });
    this.bg.rect(0, 0, size, size);
    this.container.addChild(this.bg);

    if (data.colorVariation) {
      this.overlay = new Graphics();
      this.overlay.fill({ color: new Color(data.colorVariation).toNumber() });
      this.overlay.rect(0, 0, size, size);
      this.container.addChild(this.overlay);
    }

    this.shadow1 = new Sprite(cornerShadow);
    this.shadow1.alpha = 0.5;
    this.shadow1.width = 216;
    this.shadow1.height = 216;
    this.container.addChild(this.shadow1);

    this.shadow2 = new Sprite(cornerShadow);
    this.shadow2.alpha = 0.25;
    this.shadow2.width = 216;
    this.shadow2.height = 216;
    this.shadow2.scale.set(-1, -1);
    this.container.addChild(this.shadow2);

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

    if (colorVariation && this.overlay) {
      this.overlay.clear();
      this.overlay.fill({ color: new Color(colorVariation).toNumber() });
      this.overlay.rect(0, 0, size, size);
    }
  }

  updateShadows(data: FluxelData) {
    this.shadow1.x = data.shadow1OffsetX;
    this.shadow1.y = data.shadow1OffsetY;
    this.shadow2.x = data.shadow2OffsetX;
    this.shadow2.y = data.shadow2OffsetY;
  }
}
