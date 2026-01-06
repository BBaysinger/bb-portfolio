import React, {
  useEffect,
  useRef,
  useState,
  useMemo,
  useCallback,
} from "react";

import { CanvasRenderer } from "./CanvasRenderer";
import { ISpriteRenderer } from "./RenderingAllTypes";
import { RenderStrategyType } from "./RenderingAllTypes";
import styles from "./SpriteSheetPlayer.module.scss";
import { WebGlRenderer } from "./WebGlRenderer";

const DEFAULT_RENDER_STRATEGY: RenderStrategyType = "css";

interface SpriteSheetPlayerProps {
  src: string;
  autoPlay?: boolean;
  fps?: number | number[];
  loops?: number;
  randomFrame?: boolean;
  onEnd?: () => void;
  endFrame?: number | "last";
  frameControl?: number | null;
  className?: string;
  renderStrategy?: RenderStrategyType;
}

/**
 * SpriteSheetPlayer
 *
 * Sprite sheet animation component supporting CSS, Canvas, and WebGL rendering strategies.
 *
 * Sprite metadata (frame width/height/count) is parsed from the filename.
 * Supported format: `name_w{width}h{height}f{frameCount}.ext`
 * Example: `explosion_w72h72f16.webp`
 *
 * Rendering notes:
 * - `canvas` generally the most predictable (but I'm seeing scaling issues intermittently).
 * - `css` can be convenient but is more susceptible to browser decode/paint timing.
 * - `webgl` can be fast once warm, but setup/texture uploads can be expensive depending on device.
 *
 * TODO: Further optimize rendering strategies, particularly WebGL, which is *supposed* to be the most performant.
 * TODO: Need a mode that animates by shifting an image containing a single visual (versus frame-by-frame).
 *
 * ## Props
 * @param {string} src - Sprite sheet URL with encoded dimensions and frame count.
 * @param {boolean} [autoPlay=true] - Whether to automatically start playback on mount.
 * @param {number | number[]} [fps=30] - Frames per second (single number or per-frame array).
 * @param {number} [loops=0] - Number of times to loop (0 = infinite).
 * @param {boolean} [randomFrame=false] - Whether to show a random frame on init or each step.
 * @param {() => void} [onEnd] - Callback when animation completes all loops.
 * @param {number | "last"} [endFrame=0] - Frame to display after a finite animation ends (0-based).
 *                                      - Use an integer frame index.
 *                                      - Use "last" to display the final frame.
 *                                      - Use -1 to hide the sprite while keeping resources warm (similar to `frameControl === -1`).
 * @param {number | null} [frameControl=null] - Manually control the frame index (null = autoplay).
 *                                             Use -1 to hide the sprite while keeping the spritesheet warm (pre-fetched/decoded).
 * @param {string} [className=""] - Additional class name(s) to apply to wrapper div.
 * @param {"css" | "canvas" | "webgl"} [renderStrategy="css"] - Strategy for rendering sprite frames.
 *
 * @returns A responsive, frame-accurate sprite player that adapts to playback and rendering requirements.
 *
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
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
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
    if (!canvasRef.current || !meta) return;

    if (!rendererRef.current || renderStrategyChanged()) {
      // Clean up existing renderer if switching
      rendererRef.current?.dispose();

      switch (renderStrategy) {
        case "webgl":
          rendererRef.current = new WebGlRenderer(canvasRef.current, src, meta);
          break;
        case "canvas":
          rendererRef.current = new CanvasRenderer(
            canvasRef.current,
            src,
            meta,
          );
          break;
        default:
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
      rendererRef.current.drawFrame(effectiveFrameIndex);
    }

    function renderStrategyChanged() {
      return (
        (renderStrategy === "webgl" &&
          !(rendererRef.current instanceof WebGlRenderer)) ||
        (renderStrategy === "canvas" &&
          !(rendererRef.current instanceof CanvasRenderer))
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

  const { frameWidth, frameHeight, frameCount } = meta;
  const totalCols = Math.min(frameCount, Math.floor(4096 / frameWidth));
  const totalRows = Math.ceil(frameCount / totalCols);
  // Even when hidden via frameControl === -1, keep the URL referenced so the browser can
  // fetch+decode ahead of time (and so the renderer can upload to GPU in webgl mode).
  const backgroundImage = `url(${src})`;
  const col =
    effectiveFrameIndex !== null ? effectiveFrameIndex % totalCols : 0;
  const row =
    effectiveFrameIndex !== null
      ? Math.floor(effectiveFrameIndex / totalCols)
      : 0;
  const backgroundSize = `${totalCols * 100}% ${totalRows * 100}%`;
  const backgroundPosition = `${(col / (totalCols - 1 || 1)) * 100}% ${(row / (totalRows - 1 || 1)) * 100}%`;

  return (
    <div ref={wrapperRef} className={className}>
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
            style={{
              width: "100%",
              height: "100%",
              aspectRatio: `${frameWidth} / ${frameHeight}`,
              backgroundImage,
              // When hidden, force the background off-element so nothing is drawn, while the URL stays warm.
              backgroundPosition: isHidden
                ? "-99999px -99999px"
                : backgroundPosition,
              backgroundSize,
              backgroundRepeat: "no-repeat",
              imageRendering: "pixelated",
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
