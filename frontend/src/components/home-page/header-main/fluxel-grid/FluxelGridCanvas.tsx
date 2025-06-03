import { useRef, useEffect, forwardRef, useImperativeHandle } from "react";

import { Application, Container } from "pixi.js";
import { FluxelData } from "./FluxelSprite";
import { FluxelSprite } from "./FluxelSprite";

interface FluxelGridCanvasProps {
  gridData: FluxelData[][];
  width: number;
  height: number;
  size: number; // Add size to props
}

export interface FluxelGridCanvasHandle {
  updateFluxel: (
    row: number,
    col: number,
    influence: number,
    color?: string,
  ) => void;
  updateShadows: (row: number, col: number, data: FluxelData) => void;
}

const FluxelGridCanvas = forwardRef<
  FluxelGridCanvasHandle,
  FluxelGridCanvasProps
>(({ gridData, width, height, size }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const appRef = useRef<Application | null>(null);
  const fluxelsRef = useRef<FluxelSprite[][]>([]);

  useEffect(() => {
    if (!canvasRef.current) return;

    const app = new Application({
      view: canvasRef.current,
      width,
      height,
      backgroundAlpha: 0,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });
    appRef.current = app;

    const fluxelContainer = new Container();
    app.stage.addChild(fluxelContainer);

    const fluxels: FluxelSprite[][] = [];
    for (let row = 0; row < gridData.length; row++) {
      const rowSprites: FluxelSprite[] = [];
      for (let col = 0; col < gridData[row].length; col++) {
        const data = gridData[row][col];
        const sprite = new FluxelSprite(data, size);
        fluxelContainer.addChild(sprite.container);
        rowSprites.push(sprite);
      }
      fluxels.push(rowSprites);
    }
    fluxelsRef.current = fluxels;

    return () => {
      if (appRef.current && typeof appRef.current.destroy === "function") {
        try {
          appRef.current.destroy(true, { children: true });
        } catch (err) {
          console.warn("Pixi app destroy failed:", err);
        }
        appRef.current = null;
      }
    };
  }, [gridData, width, height, size]);

  useImperativeHandle(ref, () => ({
    updateFluxel(row, col, influence, color) {
      fluxelsRef.current[row]?.[col]?.updateInfluence(influence, color);
    },
    updateShadows(row, col, data) {
      fluxelsRef.current[row]?.[col]?.updateShadows(data);
    },
  }));

  return <canvas ref={canvasRef} style={{ width: "100%", height: "100%" }} />;
});

export default FluxelGridCanvas;
