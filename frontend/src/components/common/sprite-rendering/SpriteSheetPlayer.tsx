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

const DEFAULT_RENDER_STRATEGY: RenderStrategyType = "canvas";

interface SpriteSheetPlayerProps {
  src: string;
  autoPlay?: boolean;
  fps?: number | number[];
  loops?: number;
  randomFrame?: boolean;
  onEnd?: () => void;
  frameControl?: number | null;
  className?: string;
  renderStrategy?: RenderStrategyType;
}

/**
 * SpriteSheetPlayer
 *
 * A versatile sprite sheet animation component supporting CSS, Canvas, and WebGL rendering strategies.
 * Accepts sprite sheets with a specific filename format to auto-parse dimensions and frame count.
 * Capable of auto-playing, looping, or manually controlling playback, with optional per-frame FPS and random frame selection.
 *
 * NOTE that WebGL has substantial rendering cost (on my machine full screen @ 3584×2240),
 * and there are some defects observed in CSS, including delayed load time, even though
 * the decoded image data is retained in memory. Canvas seems the best for now.
 *
 * TODO: Revisit the other rendering strategies later, particularly WebGL, which is *supposed* to be the most performant.
 *
 * TODO: We need a mode that animates by shifting an image containing a single visual (versus frame-by-frame).
 *
 * Supported filename format: `name_w{width}h{height}f{frameCount}.ext`
 * Example: `explosion_w72h72f16.webp`
 *
 * ## Features:
 * - Auto-parses sprite metadata from filename.
 * - Supports multiple rendering strategies: `"css"`, `"canvas"`, or `"webgl"`.
 * - Flexible FPS control: single value or per-frame array.
 * - Handles looping and end callbacks.
 * - Supports external frame control (via prop).
 * - Optimized with requestAnimationFrame and useMemo.
 *
 * ## Props:
 * @param {string} src - Sprite sheet URL with encoded dimensions and frame count.
 * @param {boolean} [autoPlay=true] - Whether to automatically start playback on mount.
 * @param {number | number[]} [fps=30] - Frames per second (single number or per-frame array).
 * @param {number} [loops=0] - Number of times to loop (0 = infinite).
 * @param {boolean} [randomFrame=false] - Whether to show a random frame on init or each step.
 * @param {() => void} [onEnd] - Callback when animation completes all loops.
 * @param {number | null} [frameControl=null] - Manually control the frame index (null = autoplay).
 *                                             Use -1 to render blank.
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

  const scheduleFrameIndexUpdate = useCallback((next: number | null) => {
    // This is intentionally immediate. Using RAF here adds a visible ~1 frame delay
    // when swapping sprite sequences (e.g. energy bars ending → lightning starting),
    // even when the spritesheet is already warm-loaded.
    setFrameIndex(next);
  }, []);

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
      scheduleFrameIndexUpdate(frameControl);
      return;
    }

    // When entering autoplay mode (frameControl === null), always default to the first frame
    // on initial display. `randomFrame` affects subsequent animation ticks, not the initial frame.
    frameRef.current = 0;
    scheduleFrameIndexUpdate(0);
  }, [frameControl, src, randomFrame, meta, scheduleFrameIndexUpdate]);

  useEffect(() => {
    if (!meta || frameControl === -1) return;

    const shouldAnimate =
      (autoPlay && frameControl === null) ||
      (randomFrame && frameControl === null);

    if (!shouldAnimate) return;

    let isCancelled = false;
    completedLoopsRef.current = 0;
    frameRef.current = 0;
    scheduleFrameIndexUpdate(0);
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
            // Always default back to the first frame when a finite animation completes.
            frameRef.current = 0;
            setFrameIndex(0);
            isCancelled = true;
            onEnd?.();
            return;
          }
        } else {
          let next = currentIndex + 1;

          if (next >= meta.frameCount) {
            completedLoopsRef.current++;
            if (loops !== 0 && completedLoopsRef.current >= loops) {
              // Always default back to the first frame when a finite animation completes.
              frameRef.current = 0;
              setFrameIndex(0);
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
    scheduleFrameIndexUpdate,
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

    if (frameIndex !== null && rendererRef.current) {
      rendererRef.current.drawFrame(frameIndex);
    }

    function renderStrategyChanged() {
      return (
        (renderStrategy === "webgl" &&
          !(rendererRef.current instanceof WebGlRenderer)) ||
        (renderStrategy === "canvas" &&
          !(rendererRef.current instanceof CanvasRenderer))
      );
    }
  }, [frameIndex, meta, src, renderStrategy]);

  if (!meta) return null;

  const { frameWidth, frameHeight, frameCount } = meta;
  const totalCols = Math.min(frameCount, Math.floor(4096 / frameWidth));
  const totalRows = Math.ceil(frameCount / totalCols);
  // Even when "hidden" via frameControl === -1, keep the URL referenced so the
  // browser/renderer can still fetch+decode the spritesheet ahead of time.
  const backgroundImage = `url(${src})`;
  const col = frameIndex !== null ? frameIndex % totalCols : 0;
  const row = frameIndex !== null ? Math.floor(frameIndex / totalCols) : 0;
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
            // When "hidden" (frameControl === -1), keep the canvas mounted so the
            // renderer can still fetch/decode the spritesheet, but make it non-visible
            // and non-interactive.
            ...(frameControl === -1
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
                  display: frameIndex === null ? "none" : ("block" as const),
                }),
          }}
        />
      ) : (
        frameIndex !== null && (
          <div
            className={styles.spriteSheet}
            style={{
              width: "100%",
              height: "100%",
              aspectRatio: `${frameWidth} / ${frameHeight}`,
              backgroundImage,
              // When "hidden", position far outside the element so it draws nothing
              // while still keeping the spritesheet URL warm.
              backgroundPosition:
                frameControl === -1 ? "-99999px -99999px" : backgroundPosition,
              backgroundSize,
              backgroundRepeat: "no-repeat",
              imageRendering: "pixelated",
              opacity: frameControl === -1 ? 0 : 1,
              pointerEvents: frameControl === -1 ? "none" : undefined,
            }}
          />
        )
      )}
    </div>
  );
};

export default SpriteSheetPlayer;
