/**
 * Pixi.js-backed fluxel grid renderer used by the homepage header scene.
 *
 * Rebuilds a canvas scene composed of square "fluxels" whose shadows and
 * colors are driven by the reactive `gridData` matrix. The component mirrors
 * the SVG implementation's visual behavior while offering higher runtime
 * performance on large grids.
 *
 * Key exports:
 * - FluxelPixiGrid – React component exposing {@link FluxelGridHandle} for
 *   external animation controllers.
 *
 * Implementation notes:
 * - Creates a Pixi `Application` on mount and tears it down on unmount to
 *   avoid GPU resource leaks.
 * - Uses debounced resize handling to rebuild display objects after the user
 *   stops resizing the viewport, preventing jank.
 * - Applies strict CSP-friendly asset loading (no createImageBitmap workers)
 *   so the scene functions in environments that disallow blob URLs.
 *
 * @example
 * ```tsx
 * const gridRef = useRef<FluxelGridHandle>(null);
 * return (
 *   <FluxelPixiGrid
 *     ref={gridRef}
 *     gridData={matrix}
 *     className="myGrid"
 *     onLayoutUpdateRequest={(cb) => cb()}
 *   />
 * );
 * ```
 */
"use client";

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

import type { FluxelGridHandle, FluxelGridProps } from "./FluxelAllTypes";
import styles from "./FluxelPixiGrid.module.scss";
import { useFluxelResizeWatcher } from "./useFluxelResizeWatcher";

const SHADOW_SRC = "/images/hero/corner-shadow.webp";
const DEBUG_SINGLE_FLUXEL = false;

type ShadowSprites = {
  base: Graphics;
  shadowTr: Sprite | null;
  shadowBl: Sprite | null;
  shadowTrBase?: { x: number; y: number };
  shadowBlBase?: { x: number; y: number };
};

const FluxelPixiGrid = forwardRef<FluxelGridHandle, FluxelGridProps>(
  ({ gridData, className, onLayoutUpdateRequest }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const appRef = useRef<Application | null>(null);
    const containerRef = useRef<Container | null>(null);
    const fluxelSpritesRef = useRef<(ShadowSprites | null)[][]>([]);
    const gridDataRef = useRef(gridData);
    const fluxelSizeRef = useRef(0);
    const textureRef = useRef<Texture | null>(null);
    const isResizingRef = useRef(false);
    const gridParentRef = useRef<HTMLDivElement | null>(null);

    const rows = gridData.length;
    const cols = gridData[0]?.length || 0;

    useEffect(() => {
      gridParentRef.current = canvasRef.current
        ?.parentElement as HTMLDivElement | null;
    }, []);

    useEffect(() => {
      // Avoid Pixi's createImageBitmap worker to satisfy strict CSP (no blob workers).
      // This is a global Pixi setting; do it once per mount.
      Assets.setPreferences({ preferCreateImageBitmap: false });
    }, []);

    const updateSprites = useCallback(() => {
      if (isResizingRef.current) return;
      const sprites = fluxelSpritesRef.current;
      const size = fluxelSizeRef.current;
      if (!sprites.length || size <= 0) return;

      const shadowScale = size / 72;

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

          // Match SVG behavior:
          // --base-color: rgba(20, 20, 20, influence * 1.0 - 0.1)
          const baseTint = 0x141414;

          // In the SVG renderer we can apply `colorVariation` as an overlay CSS variable.
          // Pixi would require parsing CSS color strings to numeric tints; we intentionally
          // keep this implementation minimal and treat `transparent` as "hide this cell".
          const isHidden = colorVariation === "transparent";
          const baseAlpha = isHidden
            ? 0
            : Math.max(0, Math.min(1, influence * 1.0 - 0.1));

          spriteGroup.base.clear();
          spriteGroup.base.rect(0, 0, size, size);
          spriteGroup.base.fill({ color: baseTint, alpha: baseAlpha });

          if (spriteGroup.shadowTr && spriteGroup.shadowTrBase) {
            spriteGroup.shadowTr.position.set(
              spriteGroup.shadowTrBase.x + shadowTrOffsetX * shadowScale,
              spriteGroup.shadowTrBase.y + shadowTrOffsetY * shadowScale,
            );
          }
          if (spriteGroup.shadowBl && spriteGroup.shadowBlBase) {
            spriteGroup.shadowBl.position.set(
              spriteGroup.shadowBlBase.x + shadowBlOffsetX * shadowScale,
              spriteGroup.shadowBlBase.y + shadowBlOffsetY * shadowScale,
            );
          }

          // (No tint needed; fill() sets the color)
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

      // Transient empty data can occur during hot reloads / initial boot.
      // Guard here to avoid division-by-zero and building invalid matrices.
      if (rows <= 0 || cols <= 0) {
        fluxelSizeRef.current = 0;
        const oldChildren = container.removeChildren();
        for (const child of oldChildren) {
          try {
            child.destroy({ children: true });
          } catch {
            // best-effort cleanup
          }
        }
        return;
      }

      const parent = canvas.parentElement;
      if (!parent) return;
      const bounds = parent.getBoundingClientRect();
      const logicalWidth = Math.max(1, bounds.width);
      const logicalHeight = Math.max(1, bounds.height);

      app.renderer.resize(logicalWidth, logicalHeight);

      const size = Math.max(logicalWidth / cols, logicalHeight / rows);
      fluxelSizeRef.current = size;

      const offsetX = (logicalWidth - cols * size) / 2;
      const offsetY = (logicalHeight - rows * size) / 2;

      // IMPORTANT: destroy previous display objects to avoid GPU/memory leaks.
      // Rebuilding the full grid on each resize without destroying will balloon
      // allocations and can hard-crash the browser tab.
      const oldChildren = container.removeChildren();
      for (const child of oldChildren) {
        try {
          child.destroy({ children: true });
        } catch {
          // best-effort cleanup
        }
      }

      const sprites: (ShadowSprites | null)[][] = [];

      const targetRow = Math.floor(rows / 2);
      const targetCol = Math.floor(cols / 2);

      for (let r = 0; r < rows; r++) {
        sprites[r] = [];
        for (let c = 0; c < cols; c++) {
          if (DEBUG_SINGLE_FLUXEL && (r !== targetRow || c !== targetCol)) {
            sprites[r][c] = null;
            continue;
          }

          const group = new Container();
          group.position.set(
            Math.round(c * size + offsetX),
            Math.round(r * size + offsetY),
          );

          const base = new Graphics();
          base.position.set(0, 0);

          const shadowScale = size / 72;

          const shadowTr = texture ? new Sprite({ texture }) : null;
          if (shadowTr) {
            shadowTr.anchor.set(0, 0);
            shadowTr.scale.set(shadowScale);
            shadowTr.alpha = 0.5;
            shadowTr.position.set(-34 * shadowScale, -110 * shadowScale);
          }

          const shadowBl = texture ? new Sprite({ texture }) : null;
          if (shadowBl) {
            shadowBl.anchor.set(0, 0);
            shadowBl.scale.set(-shadowScale, -shadowScale);
            shadowBl.alpha = 0.25;
            // Baseline matches SVG: x/y plus a local scale(-1,-1).
            // This places the inner "L" corner (crotch) at the fluxel's bottom-left.
            shadowBl.position.set(100 * shadowScale, 185 * shadowScale);
          }

          const mask = new Graphics();
          mask.rect(0, 0, size, size);
          // Used as the actual mask for shadow sprites; keep it invisible.
          mask.fill({ color: 0xffffff, alpha: 0.0 });
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
            shadowTrBase: shadowTr
              ? { x: shadowTr.position.x, y: shadowTr.position.y }
              : undefined,
            shadowBlBase: shadowBl
              ? { x: shadowBl.position.x, y: shadowBl.position.y }
              : undefined,
          } as ShadowSprites;
        }
      }

      fluxelSpritesRef.current = sprites;
      updateSprites();
    }, [cols, rows, updateSprites]);

    const layoutUpdateRef = useRef(onLayoutUpdateRequest);

    useEffect(() => {
      layoutUpdateRef.current = onLayoutUpdateRequest;
    }, [onLayoutUpdateRequest]);

    const notifyLayoutUpdate = useCallback(() => {
      // GridController uses this callback to sync refs + measure fluxel size.
      // `buildGrid()` already did the work; avoid rebuilding twice.
      layoutUpdateRef.current?.(() => {
        // no-op
      });
    }, []);

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

      // Even in client components, Next can evaluate modules in non-browser contexts.
      // Bail out early if `window` is unavailable.
      if (typeof window === "undefined") return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const app = new Application();
      let canceled = false;
      app
        .init({
          canvas,
          backgroundAlpha: 0,
          antialias: false,
          resolution: window.devicePixelRatio || 1,
          autoDensity: true,
        })
        .then(async () => {
          if (canceled) return;

          appRef.current = app;
          if (app.renderer.background) {
            app.renderer.background.alpha = 0; // keep canvas transparent
          }
          app.ticker.stop(); // render on demand

          const container = new Container();
          containerRef.current = container;
          app.stage.addChild(container);

          const texture = (await Assets.load(SHADOW_SRC)) as Texture;
          if (canceled) return;
          textureRef.current = texture;

          buildGrid();
          notifyLayoutUpdate();
          app.render();
        })
        .catch((err) => {
          if (!canceled) console.warn("Pixi init failed", err);
        });

      return () => {
        canceled = true;
        try {
          app.destroy(true, { children: true });
        } catch (err) {
          console.warn("Pixi destroy failed", err);
        }
        appRef.current = null;
        containerRef.current = null;
        textureRef.current = null;
        fluxelSpritesRef.current = [];
      };
    }, [buildGrid, notifyLayoutUpdate]);

    const applyFinalResize = useCallback(() => {
      isResizingRef.current = false;
      buildGrid();
      notifyLayoutUpdate();
      appRef.current?.render();
    }, [buildGrid, notifyLayoutUpdate]);

    useFluxelResizeWatcher(() => gridParentRef.current, applyFinalResize, {
      debounceMs: 200,
      onResizeStart: () => {
        isResizingRef.current = true;
      },
    });

    useEffect(() => {
      return () => {
        isResizingRef.current = false;
      };
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        getFluxelAt(x, y) {
          const canvas = canvasRef.current;
          const size = fluxelSizeRef.current;
          if (!canvas || size === 0 || rows <= 0 || cols <= 0) return null;

          const { left, top } = canvas.getBoundingClientRect();
          const relativeX = x - left;
          const relativeY = y - top;

          const r = Math.min(Math.max(0, Math.floor(relativeY / size)), rows - 1);
          const c = Math.min(Math.max(0, Math.floor(relativeX / size)), cols - 1);

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
