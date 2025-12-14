import clsx from "clsx";
import {
  Application,
  Assets,
  Container,
  Graphics,
  Sprite,
  Texture,
} from "pixi.js";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";

import useResponsiveScaler from "@/hooks/useResponsiveScaler";

import type { FluxelGridHandle, FluxelGridProps } from "./FluxelAllTypes";
import styles from "./FluxelPixiGrid.module.scss";

const SHADOW_SRC = "/images/hero/corner-shadow.webp";

type ShadowSprites = {
  base: Graphics;
  shadowTr: Sprite | null;
  shadowBl: Sprite | null;
};

const parseColor = (value?: string) => {
  if (!value || value === "transparent") return null;
  if (value.startsWith("#")) {
    const hex = Number.parseInt(value.slice(1), 16);
    return Number.isFinite(hex) ? hex : null;
  }
  return null;
};

const FluxelPixiGrid = forwardRef<FluxelGridHandle, FluxelGridProps>(
  ({ gridData, className, onLayoutUpdateRequest }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const appRef = useRef<Application | null>(null);
    const containerRef = useRef<Container | null>(null);
    const fluxelSpritesRef = useRef<ShadowSprites[][]>([]);
    const gridDataRef = useRef(gridData);
    const fluxelSizeRef = useRef(0);
    const resizeObserverRef = useRef<ResizeObserver | null>(null);
    const textureRef = useRef<Texture | null>(null);

    const rows = gridData.length;
    const cols = gridData[0]?.length || 0;

    const scaler = useResponsiveScaler(4 / 3, 1280, "cover");

    // Avoid Pixi's createImageBitmap worker to satisfy strict CSP (no blob workers).
    Assets.setPreferences({ preferCreateImageBitmap: false });

    const updateSprites = useCallback(() => {
      const sprites = fluxelSpritesRef.current;
      const size = fluxelSizeRef.current;
      if (!sprites.length || size <= 0) return;

      for (let r = 0; r < sprites.length; r++) {
        for (let c = 0; c < sprites[r].length; c++) {
          const fluxel = gridDataRef.current[r]?.[c];
          const spriteGroup = sprites[r][c];
          if (!fluxel || !spriteGroup) continue;

          const {
            influence,
            shadowTrOffsetX,
            shadowTrOffsetY,
            shadowBlOffsetX,
            shadowBlOffsetY,
            colorVariation,
          } = fluxel;

          const baseTint = parseColor(colorVariation) ?? 0x6b7f3c;
          const baseAlpha = Math.max(
            0.25,
            Math.min(0.9, influence * 0.9 + 0.2),
          );

          spriteGroup.base.clear();
          spriteGroup.base.rect(0, 0, size - 0.5, size - 0.5);
          spriteGroup.base.fill({ color: baseTint, alpha: baseAlpha });

          if (spriteGroup.shadowTr) {
            spriteGroup.shadowTr.position.set(shadowTrOffsetX, shadowTrOffsetY);
          }
          if (spriteGroup.shadowBl) {
            spriteGroup.shadowBl.position.set(
              size + shadowBlOffsetX,
              size + shadowBlOffsetY,
            );
          }

          spriteGroup.base.tint = baseTint;
        }
      }

      appRef.current?.render();
    }, []);

    const buildGrid = useCallback(() => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      const app = appRef.current;
      const texture = textureRef.current;
      if (!canvas || !container || !app) return;

      const parent = canvas.parentElement;
      if (!parent) return;
      const bounds = parent.getBoundingClientRect();
      const logicalWidth = Math.max(1, scaler.width || bounds.width);
      const logicalHeight = Math.max(1, scaler.height || bounds.height);

      app.renderer.resize(logicalWidth, logicalHeight);

      const size = Math.max(logicalWidth / cols, logicalHeight / rows);
      fluxelSizeRef.current = size;

      const offsetX = (logicalWidth - cols * size) / 2;
      const offsetY = (logicalHeight - rows * size) / 2;

      container.removeChildren();
      const sprites: ShadowSprites[][] = [];

      for (let r = 0; r < rows; r++) {
        sprites[r] = [];
        for (let c = 0; c < cols; c++) {
          const group = new Container();
          group.position.set(
            Math.round(c * size + offsetX),
            Math.round(r * size + offsetY),
          );

          const base = new Graphics();
          base.position.set(0, 0);

          const shadowTr = texture ? new Sprite({ texture }) : null;
          if (shadowTr) {
            shadowTr.anchor.set(0, 0);
            shadowTr.alpha = 0.5;
          }

          const shadowBl = texture ? new Sprite({ texture }) : null;
          if (shadowBl) {
            shadowBl.anchor.set(1, 1);
            shadowBl.scale.set(-1, -1);
            shadowBl.alpha = 0.25;
            shadowBl.position.set(size, size);
          }

          const mask = new Graphics();
          mask.rect(0, 0, size, size);
          mask.fill({ color: 0xffffff, alpha: 1 });
          mask.renderable = false; // keep mask from drawing while still clipping sprites
          mask.eventMode = "none";

          group.addChild(base);

          const shadowLayer = new Container();
          shadowLayer.mask = mask;
          if (shadowTr) shadowLayer.addChild(shadowTr);
          if (shadowBl) shadowLayer.addChild(shadowBl);
          group.addChild(shadowLayer);
          group.addChild(mask);

          container.addChild(group);
          sprites[r][c] = {
            base,
            shadowTr: shadowTr as Sprite | null,
            shadowBl: shadowBl as Sprite | null,
          } as ShadowSprites;
        }
      }

      fluxelSpritesRef.current = sprites;
      updateSprites();
    }, [cols, rows, updateSprites, scaler.height, scaler.width]);

    const layoutUpdateRef = useRef(onLayoutUpdateRequest);

    useEffect(() => {
      layoutUpdateRef.current = onLayoutUpdateRequest;
    }, [onLayoutUpdateRequest]);

    const notifyLayoutUpdate = useCallback(() => {
      layoutUpdateRef.current?.(() => buildGrid());
    }, [buildGrid]);

    useEffect(() => {
      buildGrid();
      notifyLayoutUpdate();
      appRef.current?.render();
    }, [buildGrid, notifyLayoutUpdate]);

    useEffect(() => {
      gridDataRef.current = gridData;
      updateSprites();
    }, [gridData, updateSprites]);

    useEffect(() => {
      if (appRef.current) return; // idempotent in StrictMode

      const canvas = canvasRef.current;
      if (!canvas) return;

      const app = new Application();
      app
        .init({
          canvas,
          backgroundAlpha: 0,
          antialias: false,
          resolution: window.devicePixelRatio || 1,
          autoDensity: true,
        })
        .then(async () => {
          appRef.current = app;
          if (app.renderer.background) {
            app.renderer.background.alpha = 0; // keep canvas transparent
          }
          app.ticker.stop(); // render on demand

          const container = new Container();
          containerRef.current = container;
          app.stage.addChild(container);

          const texture = (await Assets.load(SHADOW_SRC)) as Texture;
          textureRef.current = texture;

          buildGrid();
          notifyLayoutUpdate();
          app.render();
        })
        .catch((err) => console.warn("Pixi init failed", err));

      return () => {
        resizeObserverRef.current?.disconnect();
        if (appRef.current) {
          try {
            appRef.current.destroy(true, { children: true });
          } catch (err) {
            console.warn("Pixi destroy failed", err);
          }
          appRef.current = null;
          containerRef.current = null;
        }
      };
    }, [buildGrid, notifyLayoutUpdate]);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const parent = canvas.parentElement;
      if (!parent) return;

      const resize = () => {
        buildGrid();
        notifyLayoutUpdate();
        appRef.current?.render();
      };

      const observer = new ResizeObserver(() => {
        requestAnimationFrame(resize);
      });
      observer.observe(parent);
      resizeObserverRef.current = observer;

      return () => observer.disconnect();
    }, [buildGrid, notifyLayoutUpdate]);

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
        trackPosition() {
          // no-op for Pixi path; updates come from gridData changes
        },
      }),
      [rows, cols],
    );

    return (
      <canvas ref={canvasRef} className={clsx(styles.fluxelGrid, className)} />
    );
  },
);

FluxelPixiGrid.displayName = "FluxelPixiGrid";

export default FluxelPixiGrid;
