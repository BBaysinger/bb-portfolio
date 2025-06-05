import { useRef, useEffect, forwardRef, useImperativeHandle } from "react";

import { Application, Container, Assets, Texture, Graphics } from "pixi.js";

import type { FluxelGridHandle, FluxelGridProps } from "./FluxelGridTypes";
import { FluxelSprite } from "./FluxelSprite";
import styles from "./FluxelGridCanvas.module.scss";

/**
 * FluxelGridCanvas - renders a dynamic, resizable PixiJS grid of FluxelSprites
 *
 * @author Bradley Baysinger
 * @since The beginning of time.
 * @version N/A
 */
const FluxelGridCanvas = forwardRef<FluxelGridHandle, FluxelGridProps>(
  ({ gridData, imperativeMode, className }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
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
      let destroyed = false;
      let frameId: number;
      let resizeObserver: ResizeObserver | null = null;

      frameId = requestAnimationFrame(() => {
        const canvas = canvasRef.current;
        if (!canvas || destroyed) return;

        const dpr = window.devicePixelRatio || 1;
        const app = new Application();

        app
          .init({
            canvas,
            backgroundAlpha: 0,
            antialias: false,
            resolution: dpr,
            autoDensity: true,
          })
          .then(async () => {
            if (destroyed) return;

            appRef.current = app;
            app.ticker.maxFPS = 60;

            const fluxelContainer = fluxelContainerRef.current;
            app.stage.addChild(fluxelContainer);

            const shadowTexture = await Assets.load<Texture>(
              "/images/home/corner-shadow.webp",
            );

            const buildGrid = () => {
              const rect = canvas.getBoundingClientRect();
              const logicalWidth = rect.width;
              const logicalHeight = rect.height;

              const sizeW = logicalWidth / cols;
              const sizeH = logicalHeight / rows;
              const newSize = Math.max(sizeW, sizeH);
              fluxelSizeRef.current = newSize;

              const offsetX = (logicalWidth - cols * newSize) / 2;
              const offsetY = (logicalHeight - rows * newSize) / 2;

              fluxelContainer.removeChildren();
              const fluxels: FluxelSprite[][] = [];

              for (let row = 0; row < rows; row++) {
                fluxels[row] = [];
                for (let col = 0; col < cols; col++) {
                  const data = gridDataRef.current[row][col];
                  const sprite = new FluxelSprite(data, newSize, shadowTexture);
                  sprite.container.x = Math.round(col * newSize + offsetX);
                  sprite.container.y = Math.round(row * newSize + offsetY);
                  fluxelContainer.addChild(sprite.container);
                  fluxels[row][col] = sprite;
                }
              }

              fluxelsRef.current = fluxels;

              const debug = new Graphics();
              debug.rect(0, 0, 50, 50).fill(0xff00ff);
              fluxelContainer.addChild(debug);
            };

            const resize = () => {
              const bounds = canvas.getBoundingClientRect();
              app.renderer.resize(bounds.width, bounds.height);
              buildGrid();
            };

            resizeObserver = new ResizeObserver(() => {
              requestAnimationFrame(resize);
            });

            resizeObserver.observe(canvas);
            resize(); // initial layout
          });
      });

      return () => {
        destroyed = true;
        cancelAnimationFrame(frameId);

        if (resizeObserver) {
          resizeObserver.disconnect();
        }

        if (appRef.current) {
          try {
            appRef.current.destroy(true, { children: true });
          } catch (err) {
            console.warn("Pixi destroy failed:", err);
          }
          appRef.current = null;
        }
      };
    }, [rows, cols]);

    useImperativeHandle(
      ref,
      () => ({
        getFluxelAt(x, y) {
          const canvas = canvasRef.current;
          const size = fluxelSizeRef.current;
          if (!canvas || size === 0) return null;

          const { left, top } = canvas.getBoundingClientRect();
          const relativeX = x - left;
          const relativeY = y - top;

          const r = Math.min(Math.floor(relativeY / size), rows - 1);
          const c = Math.min(Math.floor(relativeX / size), cols - 1);

          return gridDataRef.current[r]?.[c] || null;
        },
        getContainerElement() {
          return canvasRef.current?.parentElement as HTMLDivElement | null;
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
      <canvas
        ref={canvasRef}
        className={[styles.fluxelGrid, className].join(" ")}
      />
    );
  },
);

export default FluxelGridCanvas;
