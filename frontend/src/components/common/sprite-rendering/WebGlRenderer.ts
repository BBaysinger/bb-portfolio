import { ISpriteRenderer } from "./RenderingAllTypes";

/**
 * WebGL sprite renderer (experimental).
 *
 * Responsibilities:
 * - Uploads a sprite sheet image into a WebGL texture.
 * - Renders a selected frame by sampling a sub-rectangle of that texture.
 * - Keeps rendering crisp via nearest-neighbor filtering.
 *
 * Key exports:
 * - `WebGlRenderer` – implements `ISpriteRenderer`.
 */

export class WebGlRenderer implements ISpriteRenderer {
  private gl!: WebGLRenderingContext;
  private program!: WebGLProgram;
  private texture!: WebGLTexture;
  private positionBuffer!: WebGLBuffer;
  private texcoordBuffer!: WebGLBuffer;
  private isTextureReady = false;
  private frameCount: number;
  private frameWidth: number;
  private frameHeight: number;
  private columns: number;
  private uFrameOffset: WebGLUniformLocation | null;
  private uSheetSize: WebGLUniformLocation | null;
  private uFrameSize: WebGLUniformLocation | null;
  private uTexture: WebGLUniformLocation | null;

  constructor(
    private canvas: HTMLCanvasElement,
    private imageSrc: string,
    meta: { frameWidth: number; frameHeight: number; frameCount: number },
  ) {
    const gl = canvas.getContext("webgl");
    if (!gl) throw new Error("WebGL not supported");
    this.gl = gl;

    this.frameWidth = meta.frameWidth;
    this.frameHeight = meta.frameHeight;
    this.frameCount = meta.frameCount;
    this.columns = Math.min(
      this.frameCount,
      Math.floor(4096 / this.frameWidth),
    );

    this.uFrameOffset = null;
    this.uSheetSize = null;
    this.uFrameSize = null;
    this.uTexture = null;

    this.initGL();
    this.loadTexture(this.imageSrc);
  }

  private initGL() {
    const gl = this.gl;
    const vert = `
      attribute vec2 a_position;
      attribute vec2 a_texcoord;
      varying vec2 v_texcoord;
      void main() {
        gl_Position = vec4(a_position, 0, 1);
        v_texcoord = vec2(a_texcoord.x, 1.0 - a_texcoord.y); // <-- flip Y
    }
    `;

    const frag = `
      precision mediump float;
      varying vec2 v_texcoord;
      uniform sampler2D u_texture;
      uniform vec2 u_frameOffset;
      uniform vec2 u_frameSize;
      uniform vec2 u_sheetSize;

      void main() {
        vec2 uv = v_texcoord * u_frameSize + u_frameOffset;
        vec2 texUV = uv / u_sheetSize;
        gl_FragColor = texture2D(u_texture, texUV);
      }
    `;

    const vs = this.compileShader(gl.VERTEX_SHADER, vert);
    const fs = this.compileShader(gl.FRAGMENT_SHADER, frag);
    const program = this.createProgram(vs, fs);

    gl.useProgram(program);
    this.program = program;

    // Enable proper alpha blending
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    this.uFrameOffset = gl.getUniformLocation(program, "u_frameOffset");
    this.uSheetSize = gl.getUniformLocation(program, "u_sheetSize");
    this.uFrameSize = gl.getUniformLocation(program, "u_frameSize");
    this.uTexture = gl.getUniformLocation(program, "u_texture");

    // Texture unit 0 is the conventional default; set explicitly for clarity.
    if (this.uTexture) gl.uniform1i(this.uTexture, 0);

    const posBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    );
    const posLoc = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
    this.positionBuffer = posBuffer;

    const texcoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1]),
      gl.STATIC_DRAW,
    );
    const texLoc = gl.getAttribLocation(program, "a_texcoord");
    gl.enableVertexAttribArray(texLoc);
    gl.vertexAttribPointer(texLoc, 2, gl.FLOAT, false, 0, 0);
    this.texcoordBuffer = texcoordBuffer;
  }

  private compileShader(type: number, source: string): WebGLShader {
    const shader = this.gl.createShader(type)!;
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      throw new Error(
        "Shader compile failed: " + this.gl.getShaderInfoLog(shader),
      );
    }
    return shader;
  }

  private createProgram(vs: WebGLShader, fs: WebGLShader): WebGLProgram {
    const program = this.gl.createProgram()!;
    this.gl.attachShader(program, vs);
    this.gl.attachShader(program, fs);
    this.gl.linkProgram(program);
    if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
      throw new Error(
        "Program link failed: " + this.gl.getProgramInfoLog(program),
      );
    }

    // Shaders are no longer needed after a successful link.
    this.gl.detachShader(program, vs);
    this.gl.detachShader(program, fs);
    this.gl.deleteShader(vs);
    this.gl.deleteShader(fs);
    return program;
  }

  private loadTexture(src: string) {
    const gl = this.gl;
    const texture = gl.createTexture()!;
    const image = new Image();

    // WebGL texture uploads require CORS-enabled images when cross-origin.
    // For same-origin assets this stays unset to avoid altering request behavior.
    try {
      if (typeof window !== "undefined") {
        const resolved = new URL(src, window.location.href);
        if (resolved.origin !== window.location.origin) {
          image.crossOrigin = "anonymous";
        }
      }
    } catch {
      // If URL parsing fails (e.g., unusual schemes), fall back to default behavior.
    }

    image.src = src;
    image.onload = () => {
      try {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          image,
        );
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        this.texture = texture;
        this.isTextureReady = true;

        gl.useProgram(this.program);
        if (this.uSheetSize)
          gl.uniform2f(this.uSheetSize, image.width, image.height);
        if (this.uFrameSize)
          gl.uniform2f(this.uFrameSize, this.frameWidth, this.frameHeight);

        this.drawFrame(0);
      } catch (err) {
        this.isTextureReady = false;
        // Common cause: cross-origin image without proper CORS headers.
        console.warn(
          "[WebGlRenderer] Texture upload failed; WebGL rendering disabled for this sprite.",
          err,
        );
      }
    };

    image.onerror = () => {
      this.isTextureReady = false;
      console.warn("[WebGlRenderer] Failed to load sprite image for WebGL.", {
        src,
      });
    };
  }

  private syncCanvasSizeToDisplay() {
    if (typeof window === "undefined") return;
    const dpr = window.devicePixelRatio || 1;
    const displayWidth = Math.max(1, Math.round(this.canvas.clientWidth * dpr));
    const displayHeight = Math.max(
      1,
      Math.round(this.canvas.clientHeight * dpr),
    );

    if (
      this.canvas.width !== displayWidth ||
      this.canvas.height !== displayHeight
    ) {
      this.canvas.width = displayWidth;
      this.canvas.height = displayHeight;
    }
  }

  /**
   * Draw a single frame by index.
   *
   * No-ops until the sprite texture is uploaded to the GPU.
   */
  drawFrame(index: number) {
    this.syncCanvasSizeToDisplay();

    const gl = this.gl;
    if (!this.isTextureReady || !this.texture || !this.uFrameOffset) return;
    if (!Number.isFinite(index)) return;
    const frameIndex = Math.floor(index);
    if (frameIndex < 0 || frameIndex >= this.frameCount) return;

    const col = frameIndex % this.columns;
    const row = Math.floor(frameIndex / this.columns);
    const offsetX = col * this.frameWidth;
    const offsetY = row * this.frameHeight;

    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(this.program);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.uniform2f(this.uFrameOffset, offsetX, offsetY);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  /**
   * Best-effort cleanup for GPU resources.
   */
  dispose() {
    const gl = this.gl;
    if (this.texture) gl.deleteTexture(this.texture);
    if (this.program) gl.deleteProgram(this.program);
    if (this.positionBuffer) gl.deleteBuffer(this.positionBuffer);
    if (this.texcoordBuffer) gl.deleteBuffer(this.texcoordBuffer);
  }
}
