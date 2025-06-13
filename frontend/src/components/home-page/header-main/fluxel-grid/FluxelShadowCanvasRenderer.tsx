import React, { useEffect, useRef, useImperativeHandle, forwardRef } from "react";

export interface FluxelShadowCanvasRendererHandle {
  drawShadowForFluxel: (
    x: number,
    y: number,
    size: number,
    shadowOffsetX: number,
    shadowOffsetY: number,
    alpha?: number,
    scale?: number
  ) => void;
  clear: () => void;
  resize: (width: number, height: number) => void;
}

interface Props {
  spriteUrl: string;
  width: number;
  height: number;
  style?: React.CSSProperties;
}

/**
 * FluxelShadowCanvasRenderer
 *
 * A React component that renders shadows for fluxels using a shared <canvas> element
 * representing the entire fluxel grid.
 * It samples a section of a provided sprite image and
 * composites it onto the canvas at a given position with blur and transparency.
 *
 * This is intended to offload per-fluxel shadow rendering from the DOM/SVG layer,
 * reducing complexity and improving performance, especially at scale.
 * 
 * This is an experimental thing that may or many not be in place by the time you read this, lol.
 * But it COULD enhance performance drastically over the original SVG version.
 *
 * ## Features:
 * - Accepts a sprite sheet URL and canvas dimensions.
 * - Exposes imperative methods to draw, clear, and resize the canvas.
 * - Each fluxel can individually call drawShadowForFluxel to render its shadow.
 *
 * @param {string} spriteUrl - The URL of the shadow sprite image.
 * @param {number} width - Width of the canvas.
 * @param {number} height - Height of the canvas.
 * @param {React.CSSProperties} [style] - Optional inline styles for the canvas.
 *
 * @returns A canvas element for shadow compositing, controlled via a forwarded ref.
 */
const FluxelShadowCanvasRenderer = forwardRef<FluxelShadowCanvasRendererHandle, Props>(
  ({ spriteUrl, width, height, style }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
    const spriteRef = useRef<HTMLImageElement>(new Image());
    const isLoadedRef = useRef<boolean>(false);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas context could not be created");
      ctxRef.current = ctx;

      const sprite = spriteRef.current;
      sprite.onload = () => {
        isLoadedRef.current = true;
      };
      sprite.src = spriteUrl;
    }, [spriteUrl]);

    useImperativeHandle(ref, () => ({
      drawShadowForFluxel(
        x: number,
        y: number,
        shadowOffsetX: number,
        shadowOffsetY: number,
        alpha: number = 0.4,
        scale: number = 1
      ) {
        if (!ctxRef.current || !isLoadedRef.current) return;

        const ctx = ctxRef.current;
        const sprite = spriteRef.current;
        const shadowSize = 72 * scale;

        ctx.save();
        ctx.filter = "blur(8px)";
        ctx.globalAlpha = alpha;

        ctx.drawImage(
          sprite,
          0, // sx
          0, // sy
          72, // sw
          72, // sh
          x + shadowOffsetX, // dx
          y + shadowOffsetY, // dy
          shadowSize, // dw
          shadowSize // dh
        );

        ctx.restore();
      },

      clear() {
        if (!ctxRef.current) return;
        ctxRef.current.clearRect(0, 0, width, height);
      },

      resize(newWidth, newHeight) {
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.width = newWidth;
        canvas.height = newHeight;
      },
    }));

    return (
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{ display: "block", ...style }}
      />
    );
  }
);

export default FluxelShadowCanvasRenderer;
