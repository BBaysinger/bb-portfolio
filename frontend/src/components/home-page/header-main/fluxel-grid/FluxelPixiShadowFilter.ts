import { Filter, GlProgram } from "pixi.js";
import { UniformGroup } from "@pixi/core";

interface ShadowUniforms {
  shadowTrOffset: { value: [number, number]; type: "vec2<f32>" };
  shadowBlOffset: { value: [number, number]; type: "vec2<f32>" };
  blur: { value: number; type: "f32" };
  alphaTr: { value: number; type: "f32" };
  alphaBl: { value: number; type: "f32" };
  resolution: { value: [number, number]; type: "vec2<f32>" };
}

export class FluxelPixiShadowFilter extends Filter {
  private _uniformGroup: UniformGroup<ShadowUniforms>;

  constructor(size: number) {
    const vertex = `
      precision mediump float;
      attribute vec2 aVertexPosition;
      attribute vec2 aTextureCoord;
      uniform mat3 projectionMatrix;
      varying vec2 vTextureCoord;

      void main() {
        vTextureCoord = aTextureCoord;
        gl_Position = vec4((projectionMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);
      }
    `;

    const fragment = `
      precision mediump float;

      uniform vec2 shadowTrOffset;
      uniform vec2 shadowBlOffset;
      uniform float blur;
      uniform float alphaTr;
      uniform float alphaBl;
      uniform vec2 resolution;

      void main() {
        vec2 uv = gl_FragCoord.xy / resolution;
        vec2 pixel = uv * resolution;

        vec2 deltaTr = pixel - shadowTrOffset;
        vec2 deltaBl = pixel - shadowBlOffset;

        float shadowTr = 0.0;
        float shadowBl = 0.0;

        if (shadowTrOffset.x != 0.0 || shadowTrOffset.y != 0.0) {
          float x = max(0.0, 1.0 - abs(deltaTr.x) / blur);
          float y = max(0.0, 1.0 - abs(deltaTr.y) / blur);
          shadowTr = (shadowTrOffset.y == 0.0) ? x :
                     (shadowTrOffset.x == 0.0) ? y : x * y;
        }

        if (shadowBlOffset.x != 0.0 || shadowBlOffset.y != 0.0) {
          float x = max(0.0, 1.0 - abs(deltaBl.x) / blur);
          float y = max(0.0, 1.0 - abs(deltaBl.y) / blur);
          shadowBl = (shadowBlOffset.y == 0.0) ? x :
                     (shadowBlOffset.x == 0.0) ? y : x * y;
        }

        float combined = shadowTr * alphaTr + shadowBl * alphaBl;

        gl_FragColor = vec4(0.0, 0.0, 0.0, combined);
      }
    `;

    const program = new GlProgram({ vertex, fragment });

    const uniforms = UniformGroup.from(
      {
        shadowTrOffset: { value: [0, 0], type: "vec2<f32>" },
        shadowBlOffset: { value: [0, 0], type: "vec2<f32>" },
        blur: { value: size / 2, type: "f32" },
        alphaTr: { value: 0.5, type: "f32" },
        alphaBl: { value: 0.25, type: "f32" },
        resolution: { value: [size, size], type: "vec2<f32>" },
      },
      true,
    ) as UniformGroup<ShadowUniforms>;

    super({ glProgram: program, resources: uniforms });
    this._uniformGroup = uniforms;
  }

  setShadowOffsets(
    shadowTrOffset: [number, number],
    shadowBlOffset: [number, number],
  ) {
    this._uniformGroup.uniforms.shadowTrOffset.value = shadowTrOffset;
    this._uniformGroup.uniforms.shadowBlOffset.value = shadowBlOffset;
  }

  get uniforms(): ShadowUniforms {
    return this._uniformGroup.uniforms;
  }
}
