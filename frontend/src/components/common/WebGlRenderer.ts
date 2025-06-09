export class WebGlRenderer {
  private gl!: WebGLRenderingContext;
  private program!: WebGLProgram;
  private texture!: WebGLTexture;
  private positionBuffer!: WebGLBuffer;
  private texcoordBuffer!: WebGLBuffer;
  private frameCount: number;
  private frameWidth: number;
  private frameHeight: number;
  private columns: number;
  private uFrameOffset: WebGLUniformLocation | null;
  private uSheetSize: WebGLUniformLocation | null;
  private uFrameSize: WebGLUniformLocation | null;

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
        v_texcoord = a_texcoord;
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

    this.uFrameOffset = gl.getUniformLocation(program, "u_frameOffset");
    this.uSheetSize = gl.getUniformLocation(program, "u_sheetSize");
    this.uFrameSize = gl.getUniformLocation(program, "u_frameSize");

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
    return program;
  }

  private loadTexture(src: string) {
    const gl = this.gl;
    const texture = gl.createTexture()!;
    const image = new Image();
    image.src = src;
    image.onload = () => {
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

      gl.useProgram(this.program);
      gl.uniform2f(this.uSheetSize, image.width, image.height);
      gl.uniform2f(this.uFrameSize, this.frameWidth, this.frameHeight);

      this.drawFrame(0);
    };
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
    this.syncCanvasSizeToDisplay();

    const gl = this.gl;
    if (!this.texture || !this.uFrameOffset) return;

    const col = index % this.columns;
    const row = Math.floor(index / this.columns);
    const offsetX = col * this.frameWidth;
    const offsetY = row * this.frameHeight;

    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(this.program);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.uniform2f(this.uFrameOffset, offsetX, offsetY);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  dispose() {
    const gl = this.gl;
    gl.deleteTexture(this.texture);
    gl.deleteProgram(this.program);
    gl.deleteBuffer(this.positionBuffer);
    gl.deleteBuffer(this.texcoordBuffer);
  }
}
