import { useRef, useEffect, forwardRef, useImperativeHandle } from "react";

import { Application, Container, Assets, Texture } from "pixi.js";

import type { FluxelGridHandle, FluxelGridProps } from "./FluxelGridTypes";
import { FluxelSprite } from "./FluxelSprite";
import styles from "./FluxelGridCanvas.module.scss";

const FluxelGridCanvas = forwardRef<FluxelGridHandle, FluxelGridProps>(
  ({ gridData, imperativeMode }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const appRef = useRef<Application | null>(null);
    const fluxelsRef = useRef<FluxelSprite[][]>([]);
    const fluxelSizeRef = useRef(0);
    const fluxelContainerRef = useRef<Container>(new Container());
    const gridDataRef = useRef(gridData);

    const rows = gridData.length;
    const cols = gridData[0]?.length || 0;

    useEffect(() => {
      gridDataRef.current = gridData;
    }, [gridData]);

    useEffect(() => {
      if (!canvasRef.current || !containerRef.current) return;

      const canvas = canvasRef.current;
      const container = containerRef.current;
      let isMounted = true;
      let resizeScheduled = false;

      const setupPixi = async () => {
        const app = new Application();
        await app.init({
          canvas,
          backgroundAlpha: 0,
          antialias: true,
          resolution: window.devicePixelRatio || 1,
          autoDensity: true,
        });

        app.ticker.maxFPS = 20;

        if (!isMounted) return;

        appRef.current = app;

        const fluxelContainer = fluxelContainerRef.current;
        app.stage.addChild(fluxelContainer);

        const shadowTexture = await Assets.load<Texture>(
          "/images/home/corner-shadow.webp",
        );

        const buildGrid = () => {
          const rect = container.getBoundingClientRect();
          const width = rect.width;
          const height = rect.height;

          const newSize = Math.min(width / cols || 1, height / rows || 1);
          const dpr = window.devicePixelRatio || 1;

          // Resize canvas
          canvas.width = Math.floor(cols * newSize * dpr);
          canvas.height = Math.floor(rows * newSize * dpr);
          canvas.style.width = `${cols * newSize}px`;
          canvas.style.height = `${rows * newSize}px`;
          canvas.style.imageRendering = "pixelated";

          fluxelSizeRef.current = newSize;

          fluxelContainer.removeChildren();
          const fluxels: FluxelSprite[][] = [];

          for (let row = 0; row < rows; row++) {
            const rowSprites: FluxelSprite[] = [];
            for (let col = 0; col < cols; col++) {
              const data = gridDataRef.current[row][col];
              const sprite = new FluxelSprite(data, newSize, shadowTexture);
              sprite.container.x = col * newSize;
              sprite.container.y = row * newSize;
              fluxelContainer.addChild(sprite.container);
              rowSprites.push(sprite);
            }
            fluxels.push(rowSprites);
          }

          fluxelsRef.current = fluxels;
        };

        // Initial render
        buildGrid();

        // Throttled resize
        const resizeObserver = new ResizeObserver(() => {
          if (!resizeScheduled) {
            resizeScheduled = true;
            requestAnimationFrame(() => {
              buildGrid();
              resizeScheduled = false;
            });
          }
        });

        resizeObserver.observe(container);

        // Cleanup
        return () => {
          resizeObserver.disconnect();
        };
      };

      setupPixi();

      return () => {
        isMounted = false;
        if (appRef.current) {
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
          const size = fluxelSizeRef.current;
          if (!el || size === 0) return null;

          const { left, top } = el.getBoundingClientRect();
          const relativeX = x - left;
          const relativeY = y - top;

          const r = Math.min(Math.floor(relativeY / size), gridData.length - 1);
          const c = Math.min(
            Math.floor(relativeX / size),
            gridData[0].length - 1,
          );

          return gridDataRef.current[r]?.[c] || null;
        },
        getContainerElement() {
          return containerRef.current;
        },
        getFluxelSize() {
          return fluxelSizeRef.current;
        },
        getGridData() {
          return gridDataRef.current;
        },
        trackPosition(row, col, influence, color) {
          if (!imperativeMode) return;
          fluxelsRef.current[row]?.[col]?.updateInfluence(influence, color);
        },
      }),
      [imperativeMode],
    );

    return (
      <div ref={containerRef} className={styles.fluxelGridWrapper}>
        <canvas ref={canvasRef} />
      </div>
    );
  },
);

export default FluxelGridCanvas;
