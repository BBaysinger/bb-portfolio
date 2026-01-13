/**
 * Sprite sheet player.
 *
 * Renders a sprite sheet as a frame-by-frame animation using one of several strategies:
 * - `css` (background-position)
 * - `canvas` (2D drawImage)
 * - `webgl` (texture upload + draw)
 *
 * Sprite metadata is parsed from the `src` filename.
 * Supported format: `name_w{width}h{height}f{frameCount}.ext`
 * Example: `explosion_w72h72f16.webp`
 *
 * Key exports:
 * - Default export `SpriteSheetPlayer` – React component.
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { CanvasRenderer } from "./CanvasRenderer";
import { CssRenderer } from "./CssRenderer";
import { ISpriteRenderer, RenderStrategyType } from "./RenderingAllTypes";
import styles from "./SpriteSheetPlayer.module.scss";
import { WebGlRenderer } from "./WebGlRenderer";

const DEFAULT_RENDER_STRATEGY: RenderStrategyType = "css";

/**
 * Props for `SpriteSheetPlayer`.
 */
interface SpriteSheetPlayerProps {
  /** Sprite sheet URL with encoded dimensions and frame count (see file header). */
  src: string;
  /** Whether playback starts automatically on mount (ignored when `frameControl` is set). */
  autoPlay?: boolean;
  /** Frames per second as a single value or a per-frame repeating sequence. */
  fps?: number | number[];
  /**
   * Loop count.
   * - `0` = infinite
   * - In `randomFrame` mode this effectively counts animation steps (random picks),
   *   since there is no deterministic "end of sheet" boundary.
   */
  loops?: number;
  /** If true, select random frames during playback rather than sequential frames. */
  randomFrame?: boolean;
  /** Callback invoked when a finite animation completes. */
  onEnd?: () => void;
  /** Frame to show after a finite animation ends (0-based), or "last"; `-1` hides the sprite. */
  endFrame?: number | "last";
  /** Manually control the frame index; `null` = autoplay; `-1` hides but keeps resources warm. */
  frameControl?: number | null;
  /** Extra class name(s) for the wrapper element. */
  className?: string;
  /** Rendering backend to use. */
  renderStrategy?: RenderStrategyType;
}

/**
 * Sprite sheet animation component.
 *
 * @param props - See `SpriteSheetPlayerProps`.
 * @returns Sprite player UI.
 */
const SpriteSheetPlayer: React.FC<SpriteSheetPlayerProps> = ({
  src,
  autoPlay = true,
  fps = 30,
  loops = 0,
  randomFrame = false,
  onEnd,
  endFrame = 0,
  frameControl = null,
  className = "",
  renderStrategy = DEFAULT_RENDER_STRATEGY,
}) => {
  const [frameIndex, setFrameIndex] = useState<number | null>(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cssRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<ISpriteRenderer | null>(null);

  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const frameRef = useRef<number>(0);
  const completedLoopsRef = useRef<number>(0);
  const frameDurationsRef = useRef<number[]>([]);

  const meta = useMemo(() => {
    const match = src.match(/_w(\d+)h(\d+)f(\d+)/);
    if (!match) {
      console.warn("Invalid sprite filename format:", src);
      return null;
    }
    const [, w, h, f] = match.map(Number);
    return {
      frameWidth: w,
      frameHeight: h,
      frameCount: f,
    };
  }, [src]);

  const resolveEndFrameIndex = useCallback(
    (frameCount: number): number | -1 => {
      if (endFrame === "last") return Math.max(0, frameCount - 1);
      if (typeof endFrame === "number") {
        if (endFrame === -1) return -1;
        if (Number.isNaN(endFrame) || !Number.isFinite(endFrame)) return 0;
        return Math.min(
          Math.max(Math.trunc(endFrame), 0),
          Math.max(0, frameCount - 1),
        );
      }
      return 0;
    },
    [endFrame],
  );

  useEffect(() => {
    if (!meta) return;
    const count = meta.frameCount;
    const newDurations = Array.from({ length: count }, (_, i) => {
      const val = Array.isArray(fps) ? fps[i % fps.length] || 30 : fps;
      return 1000 / (val || 30);
    });
    frameDurationsRef.current = newDurations;
  }, [meta, fps]);

  useEffect(() => {
    if (!meta || frameControl === -1) return;

    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (typeof frameControl === "number") {
      frameRef.current = frameControl;
      return;
    }

    // When entering autoplay mode (frameControl === null), always default to the first frame
    // on initial display. `randomFrame` affects subsequent animation ticks, not the initial frame.
    frameRef.current = 0;
    // Intentionally avoid setState here (repo lint: no setState directly in effect bodies).
  }, [frameControl, src, randomFrame, meta]);

  useEffect(() => {
    if (!meta || frameControl === -1) return;

    const shouldAnimate =
      (autoPlay && frameControl === null) ||
      (randomFrame && frameControl === null);

    if (!shouldAnimate) return;

    let isCancelled = false;
    completedLoopsRef.current = 0;
    frameRef.current = 0;
    // Avoid setState in the effect body; RAF drives subsequent frames.
    lastTimeRef.current = performance.now();

    const animate = (now: number) => {
      if (isCancelled || frameControl !== null || frameControl === -1 || !meta)
        return;

      const elapsed = now - lastTimeRef.current;
      const currentIndex = frameRef.current;
      const duration = frameDurationsRef.current[currentIndex] || 1000 / 30;

      if (elapsed >= duration) {
        lastTimeRef.current = now - (elapsed % duration);

        if (randomFrame) {
          const random = Math.floor(Math.random() * meta.frameCount);
          frameRef.current = random;
          setFrameIndex(random);

          completedLoopsRef.current++;
          if (loops !== 0 && completedLoopsRef.current >= loops) {
            const resolved = resolveEndFrameIndex(meta.frameCount);
            frameRef.current = resolved === -1 ? 0 : resolved;
            setFrameIndex(resolved);
            isCancelled = true;
            onEnd?.();
            return;
          }
        } else {
          let next = currentIndex + 1;

          if (next >= meta.frameCount) {
            completedLoopsRef.current++;
            if (loops !== 0 && completedLoopsRef.current >= loops) {
              const resolved = resolveEndFrameIndex(meta.frameCount);
              frameRef.current = resolved === -1 ? 0 : resolved;
              setFrameIndex(resolved);
              isCancelled = true;
              onEnd?.();
              return;
            } else {
              next = 0;
            }
          }

          frameRef.current = next;
          setFrameIndex(next);
        }
      }

      if (!isCancelled) {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);
    return () => {
      isCancelled = true;
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [
    meta,
    frameControl,
    autoPlay,
    loops,
    randomFrame,
    onEnd,
    resolveEndFrameIndex,
  ]);

  useEffect(() => {
    if (!meta) return;

    // Resolve the DOM target for the selected rendering strategy.
    // We narrow refs up-front so renderer constructors never receive `null`.
    if (renderStrategy === "css") {
      if (!cssRef.current) return;
    } else {
      if (!canvasRef.current) return;
    }

    if (!rendererRef.current || renderStrategyChanged()) {
      // Clean up existing renderer if switching
      rendererRef.current?.dispose();

      if (renderStrategy === "webgl") {
        const canvas = canvasRef.current;
        if (!canvas) return;
        rendererRef.current = new WebGlRenderer(canvas, src, meta);
      } else if (renderStrategy === "canvas") {
        const canvas = canvasRef.current;
        if (!canvas) return;
        rendererRef.current = new CanvasRenderer(canvas, src, meta);
      } else if (renderStrategy === "css") {
        const el = cssRef.current;
        if (!el) return;
        rendererRef.current = new CssRenderer(el, src, meta);
      } else {
        rendererRef.current = null;
      }
    }

    const isHidden =
      frameControl === -1 || (frameControl === null && frameIndex === -1);

    const effectiveFrameIndex =
      typeof frameControl === "number" && frameControl !== -1
        ? frameControl
        : isHidden
          ? 0
          : frameIndex;

    if (effectiveFrameIndex !== null && rendererRef.current) {
      // CSS renderer supports a sentinel `-1` frame to hide while keeping the URL referenced.
      const frameForRenderer =
        renderStrategy === "css" && isHidden ? -1 : effectiveFrameIndex;
      rendererRef.current.drawFrame(frameForRenderer);
    }

    function renderStrategyChanged() {
      return (
        (renderStrategy === "webgl" &&
          !(rendererRef.current instanceof WebGlRenderer)) ||
        (renderStrategy === "canvas" &&
          !(rendererRef.current instanceof CanvasRenderer)) ||
        (renderStrategy === "css" &&
          !(rendererRef.current instanceof CssRenderer))
      );
    }
  }, [frameControl, frameIndex, meta, src, renderStrategy]);

  if (!meta) return null;

  const isHidden =
    frameControl === -1 || (frameControl === null && frameIndex === -1);

  const effectiveFrameIndex =
    typeof frameControl === "number" && frameControl !== -1
      ? frameControl
      : isHidden
        ? 0
        : frameIndex;

  const { frameWidth, frameHeight } = meta;

  return (
    <div className={className}>
      {renderStrategy === "webgl" || renderStrategy === "canvas" ? (
        <canvas
          className={styles.spriteSheet}
          ref={canvasRef}
          width={frameWidth}
          height={frameHeight}
          style={{
            // When hidden (frameControl === -1), keep the canvas mounted so the renderer can
            // still warm-load resources, but move it offscreen and disable interaction.
            ...(isHidden
              ? {
                  position: "absolute" as const,
                  left: "-99999px",
                  top: "-99999px",
                  width: "1px",
                  height: "1px",
                  opacity: 0,
                  pointerEvents: "none" as const,
                }
              : {
                  display:
                    effectiveFrameIndex === null ? "none" : ("block" as const),
                }),
          }}
        />
      ) : (
        effectiveFrameIndex !== null && (
          <div
            className={styles.spriteSheet}
            ref={cssRef}
            style={{
              width: "100%",
              height: "100%",
              aspectRatio: `${frameWidth} / ${frameHeight}`,
              opacity: isHidden ? 0 : 1,
              pointerEvents: isHidden ? "none" : undefined,
            }}
          />
        )
      )}
    </div>
  );
};

export default SpriteSheetPlayer;
