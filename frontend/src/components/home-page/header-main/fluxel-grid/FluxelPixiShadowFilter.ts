import { Filter, GlProgram } from "pixi.js";
import { UniformGroup } from "@pixi/core";

interface ShadowUniforms {
  shadow1Offset: { value: [number, number]; type: "vec2<f32>" };
  shadow2Offset: { value: [number, number]; type: "vec2<f32>" };
  blur: { value: number; type: "f32" };
  alpha1: { value: number; type: "f32" };
  alpha2: { value: number; type: "f32" };
  resolution: { value: [number, number]; type: "vec2<f32>" };
}

export class FluxelPixiShadowFilter extends Filter {
  private uniforms: UniformGroup<ShadowUniforms>;

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

      uniform vec2 shadow1Offset;
      uniform vec2 shadow2Offset;
      uniform float blur;
      uniform float alpha1;
      uniform float alpha2;
      uniform vec2 resolution;

      void main() {
        vec2 uv = gl_FragCoord.xy / resolution;
        vec2 pixel = uv * resolution;

        float shadow1 = max(0.0, 1.0 - abs(pixel.x - shadow1Offset.x) / blur)
                      * max(0.0, 1.0 - abs(pixel.y - shadow1Offset.y) / blur);
        float shadow2 = max(0.0, 1.0 - abs(pixel.x - shadow2Offset.x) / blur)
                      * max(0.0, 1.0 - abs(pixel.y - shadow2Offset.y) / blur);

        float combined = shadow1 * alpha1 + shadow2 * alpha2;

        gl_FragColor = vec4(0.0, 0.0, 0.0, combined);
      }
    `;

    const program = new GlProgram({ vertex, fragment });

    const uniforms = UniformGroup.from(
      {
        shadow1Offset: { value: [0, 0], type: "vec2<f32>" },
        shadow2Offset: { value: [0, 0], type: "vec2<f32>" },
        blur: { value: size / 2, type: "f32" },
        alpha1: { value: 0.5, type: "f32" },
        alpha2: { value: 0.25, type: "f32" },
        resolution: { value: [size, size], type: "vec2<f32>" },
      },
      true,
    ) as UniformGroup<ShadowUniforms>;

    super({ glProgram: program, resources: uniforms });
    this.uniforms = uniforms;
  }

  setShadowOffsets(shadow1: [number, number], shadow2: [number, number]) {
    (this.uniforms as any).shadow1Offset.value = shadow1;
    (this.uniforms as any).shadow2Offset.value = shadow2;
  }
}
