import { useRef, useEffect, forwardRef, useImperativeHandle } from "react";

import { Application, Container, Assets, Texture } from "pixi.js";

import type { FluxelGridHandle, FluxelGridProps } from "./FluxelGridTypes";
import { FluxelSprite } from "./FluxelSprite";
import styles from "./FluxelGridCanvas.module.scss";

/**
 *
 *
 * @author Bradley Baysinger
 * @since The beginning of time.
 * @version N/A
 */
const FluxelGridCanvas = forwardRef<FluxelGridHandle, FluxelGridProps>(
  ({ gridData, imperativeMode }, ref) => {
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
      if (!canvasRef.current) return;

      const canvas = canvasRef.current;
      let isMounted = true;
      let resizeScheduled = false;

      const setupPixi = async () => {
        const app = new Application();
        await app.init({
          canvas,
          backgroundAlpha: 0,
          antialias: true,
          resolution: 1,
          autoDensity: false, // we'll handle our own
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
          const rect = canvas.getBoundingClientRect();
          const width = rect.width;
          const height = rect.height;

          const dpr = window.devicePixelRatio || 1;
          canvas.width = Math.floor(width * dpr);
          canvas.height = Math.floor(height * dpr);

          app.renderer.resize(canvas.width, canvas.height);

          const sizeW = width / cols;
          const sizeH = height / rows;
          const newSize = Math.max(sizeW, sizeH);
          fluxelSizeRef.current = newSize;

          fluxelContainer.removeChildren();
          const fluxels: FluxelSprite[][] = [];

          const offsetX = (width - cols * newSize) / 2;
          const offsetY = (height - rows * newSize) / 2;

          for (let row = 0; row < rows; row++) {
            fluxels[row] = [];
            for (let col = 0; col < cols; col++) {
              console.log(row, col, col * newSize + offsetX, row * newSize + offsetY);
              const data = gridDataRef.current[row][col];
              const sprite = new FluxelSprite(data, newSize, shadowTexture);
              sprite.container.x = col * newSize + offsetX;
              sprite.container.y = row * newSize + offsetY;
              fluxelContainer.addChild(sprite.container);
              fluxels[row][col] = sprite;
            }
          }

          fluxelsRef.current = fluxels;
        };

        buildGrid();

        const resizeObserver = new ResizeObserver(() => {
          if (!resizeScheduled) {
            resizeScheduled = true;
            requestAnimationFrame(() => {
              buildGrid();
              resizeScheduled = false;
            });
          }
        });

        resizeObserver.observe(canvas);

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

          const r = Math.min(Math.floor(relativeY / size), gridData.length - 1);
          const c = Math.min(
            Math.floor(relativeX / size),
            gridData[0].length - 1,
          );

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
      <div className={styles.fluxelGridWrapper}>
        <canvas ref={canvasRef} className={styles.pixelCanvas} />
      </div>
    );
  },
);

export default FluxelGridCanvas;
