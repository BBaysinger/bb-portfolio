import { useRef, useEffect, forwardRef, useImperativeHandle } from "react";

import { Application, Container, Assets, Texture, Graphics } from "pixi.js";

import type { FluxelGridHandle, FluxelGridProps } from "./FluxelGridTypes";
import { FluxelSprite } from "./FluxelSprite";
import styles from "./FluxelGridPixi.module.scss";

/**
 * FluxelGridPixi - renders a dynamic, resizable PixiJS grid of FluxelSprites
 *
 * @author Bradley Baysinger
 * @since The beginning of time.
 * @version N/A
 */
const FluxelGridPixi = forwardRef<FluxelGridHandle, FluxelGridProps>(
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

        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;

        const fallbackWidth = 800;
        const fallbackHeight = 600;

        let width = rect.width;
        let height = rect.height;

        if (width < 1 || height < 1 || !isFinite(width) || !isFinite(height)) {
          console.warn("⚠️ Invalid canvas size detected. Using fallback.");
          width = fallbackWidth;
          height = fallbackHeight;
        }

        const app = new Application();
        app
          .init({
            canvas,
            width: width,
            height: height,
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
              const bounds = canvas.getBoundingClientRect();
              const logicalWidth = bounds.width;
              const logicalHeight = bounds.height;

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
              const parent = canvas.parentElement;
              if (!parent) return;

              const bounds = parent.getBoundingClientRect();
              if (bounds.width < 1 || bounds.height < 1) return;

              app.renderer.resize(bounds.width, bounds.height);
              buildGrid();
            };

            let resizeTimeout: number | null = null;
            resizeObserver = new ResizeObserver(() => {
              if (resizeTimeout) cancelAnimationFrame(resizeTimeout);
              resizeTimeout = requestAnimationFrame(resize);
            });

            resizeObserver.observe(canvas.parentElement!);
            resize();
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

export default FluxelGridPixi;
