import {
  useRef,
  useEffect,
  forwardRef,
  useImperativeHandle,
  useState,
} from "react";

import { Application, Container } from "pixi.js";
import type { FluxelGridHandle, FluxelGridProps } from "./FluxelGridTypes";
import { FluxelSprite } from "./FluxelSprite";

const FluxelGridCanvas = forwardRef<FluxelGridHandle, FluxelGridProps>(
  ({ gridData, imperativeMode }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const appRef = useRef<Application | null>(null);
    const fluxelsRef = useRef<FluxelSprite[][]>([]);
    const gridDataRef = useRef(gridData);

    const [fluxelSize, setFluxelSize] = useState(0);
    const [rows, setRows] = useState(0);
    const [cols, setCols] = useState(0);

    useEffect(() => {
      gridDataRef.current = gridData;
      setRows(gridData.length);
      setCols(gridData[0]?.length || 0);
    }, [gridData]);

    useEffect(() => {
      if (!canvasRef.current || !containerRef.current) return;

      const canvas = canvasRef.current;
      const rect = containerRef.current.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;

      const newFluxelSize = Math.min(width / cols || 1, height / rows || 1);
      setFluxelSize(newFluxelSize);

      canvas.width = Math.floor(cols * newFluxelSize);
      canvas.height = Math.floor(rows * newFluxelSize);

      const app = new Application({
        view: canvas,
        backgroundAlpha: 0,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      });
      appRef.current = app;

      const fluxelContainer = new Container();
      app.stage.addChild(fluxelContainer);

      const fluxels: FluxelSprite[][] = [];
      for (let row = 0; row < rows; row++) {
        const rowSprites: FluxelSprite[] = [];
        for (let col = 0; col < cols; col++) {
          const data = gridData[row][col];
          const sprite = new FluxelSprite(data, newFluxelSize);
          fluxelContainer.addChild(sprite.container);
          rowSprites.push(sprite);
        }
        fluxels.push(rowSprites);
      }
      fluxelsRef.current = fluxels;

      return () => {
        if (appRef.current?.destroy) {
          try {
            appRef.current.destroy(true, { children: true });
          } catch (err) {
            console.warn("Pixi app destroy failed:", err);
          }
          appRef.current = null;
        }
      };
    }, [rows, cols]);

    useImperativeHandle(
      ref,
      () => ({
        getFluxelAt(x, y) {
          const el = containerRef.current;
          if (!el || fluxelSize === 0) return null;

          const { left, top } = el.getBoundingClientRect();
          const relativeX = x - left;
          const relativeY = y - top;

          const r = Math.min(Math.floor(relativeY / fluxelSize), rows - 1);
          const c = Math.min(Math.floor(relativeX / fluxelSize), cols - 1);

          return gridDataRef.current[r]?.[c] || null;
        },
        getContainerElement() {
          return containerRef.current;
        },
        getFluxelSize() {
          return fluxelSize;
        },
        getGridData() {
          return gridDataRef.current;
        },
        trackPosition(row, col, influence, color) {
          if (!imperativeMode) return;
          fluxelsRef.current[row]?.[col]?.updateInfluence(influence, color);
        },
      }),
      [fluxelSize, imperativeMode, rows, cols],
    );

    return (
      <div ref={containerRef} style={{ width: "100%", height: "100%" }}>
        <canvas
          ref={canvasRef}
          style={{ width: "100%", height: "100%", display: "block" }}
        />
      </div>
    );
  },
);

export default FluxelGridCanvas;
