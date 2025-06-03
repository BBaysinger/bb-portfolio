import {
  useRef,
  useEffect,
  forwardRef,
  useImperativeHandle,
  useState,
} from "react";

import { Application, Container, Graphics, Assets, Texture } from "pixi.js";
import type { FluxelGridHandle, FluxelGridProps } from "./FluxelGridTypes";
import { FluxelSprite } from "./FluxelSprite";
import styles from "./FluxelGridCanvas.module.scss";

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

      const container = containerRef.current;
      let isMounted = true;
      let resizeObserver: ResizeObserver | null = null;

      const setupPixi = async () => {
        const app = new Application();

        await app.init({
          canvas: canvasRef.current!,
          backgroundAlpha: 0,
          antialias: true,
          resolution: window.devicePixelRatio || 1,
          autoDensity: true,
        });
        app.ticker.maxFPS = 20;

        if (!isMounted) return;

        appRef.current = app;

        const fluxelContainer = new Container();
        app.stage.addChild(fluxelContainer);

        const shadowTexture = await Assets.load<Texture>(
          "/images/home/corner-shadow.webp",
        );

        const buildGrid = () => {
          const rect = container.getBoundingClientRect();
          const width = rect.width;
          const height = rect.height;

          const newSize = Math.min(width / cols || 1, height / rows || 1);
          setFluxelSize(newSize);

          fluxelContainer.removeChildren();
          const fluxels: FluxelSprite[][] = [];

          for (let row = 0; row < rows; row++) {
            const rowSprites: FluxelSprite[] = [];
            for (let col = 0; col < cols; col++) {
              const data = gridData[row][col];
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

        // Draw a test graphic
        const g = new Graphics();
        g.fill({ color: 0xff00ff });
        g.circle(600, 600, 300);
        app.stage.addChild(g);

        buildGrid();

        resizeObserver = new ResizeObserver(buildGrid);
        resizeObserver.observe(container);
      };

      setupPixi();

      return () => {
        isMounted = false;
        resizeObserver?.disconnect();
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
      <div ref={containerRef} className={styles.fluxelGridWrapper}>
        <canvas ref={canvasRef} />
      </div>
    );
  },
);

export default FluxelGridCanvas;
