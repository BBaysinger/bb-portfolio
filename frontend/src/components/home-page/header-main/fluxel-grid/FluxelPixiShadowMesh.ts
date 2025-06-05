import { Container, Graphics, Geometry, Shader, Mesh } from "pixi.js";
import { IFluxel } from "./FluxelAllTypes";

export class FluxelPixiShadowMesh extends Container implements IFluxel {
  public id: string;
  public row: number;
  public col: number;

  private size: number;
  private influence: number;
  private color?: string;

  private background: Graphics;
  private shadowMesh: Mesh<Geometry, Shader>;

  private trOffset: [number, number];
  private blOffset: [number, number];
  private alphaTr: number;
  private alphaBl: number;
  private blur: number;

  constructor(
    id: string,
    row: number,
    col: number,
    size: number,
    trOffset: [number, number] = [0, 0],
    blOffset: [number, number] = [0, 0],
    alphaTr = 0.5,
    alphaBl = 0.25,
    blur = size / 2,
  ) {
    super();

    this.id = id;
    this.row = row;
    this.col = col;
    this.size = size;
    this.trOffset = trOffset;
    this.blOffset = blOffset;
    this.alphaTr = alphaTr;
    this.alphaBl = alphaBl;
    this.blur = blur;
    this.influence = 0;

    this.position.set(col * size, row * size);

    this.background = this.createBackground();
    this.shadowMesh = this.createShadowMesh();

    this.addChild(this.background);
    this.addChild(this.shadowMesh);
  }

  private createBackground(): Graphics {
    const g = new Graphics();
    g.rect(0, 0, this.size, this.size);
    g.fill({ color: 0x141414 });
    return g;
  }

  private createShadowMesh(): Mesh<Geometry, Shader> {
    const vertexBuffer = new Float32Array([
      0,
      0,
      this.size,
      0,
      this.size,
      this.size,
      0,
      this.size,
    ]);

    const geometry = new Geometry();
    geometry.addAttribute("aVertexPosition", { buffer: vertexBuffer, size: 2 });
    geometry.addIndex([0, 1, 2, 0, 2, 3]);

    const vertex = `
      precision mediump float;
      attribute vec2 aVertexPosition;
      uniform mat3 translationMatrix;
      uniform mat3 projectionMatrix;
      varying vec2 vUV;
      void main() {
        vUV = aVertexPosition / ${this.size.toFixed(1)};
        gl_Position = vec4((projectionMatrix * translationMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);
      }
    `;

    const fragment = `
      precision mediump float;
      varying vec2 vUV;
      uniform vec2 shadowTrOffset;
      uniform vec2 shadowBlOffset;
      uniform float blur;
      uniform float alphaTr;
      uniform float alphaBl;

      void main() {
        vec2 pixel = vUV * ${this.size.toFixed(1)};
        vec2 deltaTr = pixel - shadowTrOffset;
        vec2 deltaBl = pixel - shadowBlOffset;

        float shadowTr = 0.0;
        float shadowBl = 0.0;

        if (shadowTrOffset.x != 0.0 || shadowTrOffset.y != 0.0) {
          float x = max(0.0, 1.0 - abs(deltaTr.x) / blur);
          float y = max(0.0, 1.0 - abs(deltaTr.y) / blur);
          shadowTr = (shadowTrOffset.y == 0.0) ? x : (shadowTrOffset.x == 0.0) ? y : x * y;
        }

        if (shadowBlOffset.x != 0.0 || shadowBlOffset.y != 0.0) {
          float x = max(0.0, 1.0 - abs(deltaBl.x) / blur);
          float y = max(0.0, 1.0 - abs(deltaBl.y) / blur);
          shadowBl = (shadowBlOffset.y == 0.0) ? x : (shadowBlOffset.x == 0.0) ? y : x * y;
        }

        float combined = shadowTr * alphaTr + shadowBl * alphaBl;
        gl_FragColor = vec4(0.0, 0.0, 0.0, combined);
      }
    `;

    const shader = Shader.from({
      gl: {
        vertex,
        fragment,
      },
      resources: {
        shadowTrOffset: { value: this.trOffset, type: "vec2<f32>" },
        shadowBlOffset: { value: this.blOffset, type: "vec2<f32>" },
        blur: { value: this.blur, type: "f32" },
        alphaTr: { value: this.alphaTr, type: "f32" },
        alphaBl: { value: this.alphaBl, type: "f32" },
      },
    });

    return new Mesh(geometry, shader);
  }

  public updateInfluence(influence: number, color?: string) {
    this.influence = influence;
    this.alphaTr = influence; // You could scale this if needed
    if (!this.shadowMesh.shader) return;
    this.shadowMesh.shader.resources.alphaTr.value = this.alphaTr;

    if (color && this.color !== color) {
      this.color = color;
      this.background
        .clear()
        .rect(0, 0, this.size, this.size)
        .fill({ color: Number(color) });
    }
  }

  public updateShadowOffsets(tr: [number, number], bl: [number, number]) {
    this.trOffset = tr;
    this.blOffset = bl;

    if (!this.shadowMesh.shader) return;
    this.shadowMesh.shader.resources.shadowTrOffset.value = tr;
    this.shadowMesh.shader.resources.shadowBlOffset.value = bl;
  }

  public reset() {
    this.updateInfluence(0);
  }
}
