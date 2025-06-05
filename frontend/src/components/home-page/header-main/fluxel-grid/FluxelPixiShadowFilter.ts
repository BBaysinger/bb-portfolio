import { GlProgram, Filter } from "pixi.js";
import { UniformGroup } from "@pixi/core";
import { VERSION } from "pixi.js";
console.log("PixiJS version:", VERSION);

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

export class FluxelPixiShadowFilter extends Filter {
  constructor(size: number) {
    const glProgram = new GlProgram({ vertex, fragment });

    const uniforms = UniformGroup.from({
      shadow1Offset: [0, 0],
      shadow2Offset: [0, 0],
      blur: size / 2,
      alpha1: 0.5,
      alpha2: 0.25,
      resolution: [size, size],
    }, true); // static = true

    super({ glProgram, resources: uniforms });
  }

  setShadowOffsets(shadow1: [number, number], shadow2: [number, number]) {
    (this.resources as any).shadow1Offset = shadow1;
    (this.resources as any).shadow2Offset = shadow2;
  }
}
