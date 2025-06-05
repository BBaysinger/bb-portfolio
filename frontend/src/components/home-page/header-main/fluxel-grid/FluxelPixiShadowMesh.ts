import { Mesh, Geometry, Shader, Container, Graphics } from "pixi.js";

export class FluxelPixiShadowMesh extends Container {
  private background: Graphics;
  private shadowMesh: Mesh<Geometry, Shader>;

  constructor(
    private size: number,
    private trOffset: [number, number] = [0, 0],
    private blOffset: [number, number] = [0, 0],
    private alphaTr = 0.5,
    private alphaBl = 0.25,
    private blur = size / 2,
  ) {
    super();

    this.background = this.createBackground();
    this.shadowMesh = this.createShadowMesh();

    this.addChild(this.shadowMesh);
    this.addChild(this.background);
  }

  private createBackground(): Graphics {
    const g = new Graphics();
    g.rect(0, 0, this.size, this.size).fill({ color: 0x141414 });
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

    // const program = new Program(vertex, fragment);
    const shader = Shader.from({
      gl: {
        vertex: vertex,
        fragment: fragment,
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

  updateShadowOffsets(tr: [number, number], bl: [number, number]) {
    const shader = this.shadowMesh?.shader as Shader & {
      uniforms: {
        shadowTrOffset: [number, number];
        shadowBlOffset: [number, number];
      };
    };
    if (shader?.uniforms) {
      shader.uniforms.shadowTrOffset = tr;
      shader.uniforms.shadowBlOffset = bl;
    }
  }
}
