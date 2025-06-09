import React, { useEffect, useRef, useState, useMemo } from "react";
import styles from "./SpriteSheetPlayer.module.scss";
import { WebGlRenderer } from "./WebGlRenderer";

interface SpriteSheetPlayerProps {
  src: string;
  autoPlay?: boolean;
  fps?: number | number[];
  loops?: number;
  randomFrame?: boolean;
  onEnd?: () => void;
  frameControl?: number | null;
  className?: string;
  renderStrategy?: "css" | "canvas" | "webgl";
}

/**
 *
 *
 * @author Bradley Baysinger
 * @since The beginning of time.
 * @version N/A
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
  renderStrategy = "webgl",
}) => {
  const [frameIndex, setFrameIndex] = useState<number | null>(0);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<WebGlRenderer | null>(null);

  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());
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
      setFrameIndex(frameControl);
      return;
    }

    if (randomFrame) {
      const random = Math.floor(Math.random() * meta.frameCount);
      frameRef.current = random;
      setFrameIndex(random);
    } else {
      frameRef.current = 0;
      setFrameIndex(0);
    }
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
    setFrameIndex(0);
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
            isCancelled = true;
            onEnd?.();
            return;
          }
        } else {
          let next = currentIndex + 1;

          if (next >= meta.frameCount) {
            completedLoopsRef.current++;
            if (loops !== 0 && completedLoopsRef.current >= loops) {
              frameRef.current = -1;
              setFrameIndex(null);
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
  }, [meta, frameControl, autoPlay, loops, randomFrame, onEnd]);

  useEffect(() => {
    if (!canvasRef.current || !meta || renderStrategy !== "webgl") return;
    if (!rendererRef.current) {
      rendererRef.current = new WebGlRenderer(canvasRef.current, src, meta);
    }
    if (frameIndex !== null) {
      rendererRef.current.drawFrame(frameIndex);
    }
  }, [frameIndex, meta, src, renderStrategy]);

  if (!meta) return null;

  const { frameWidth, frameHeight, frameCount } = meta;
  const totalCols = Math.min(frameCount, Math.floor(4096 / frameWidth));
  const totalRows = Math.ceil(frameCount / totalCols);
  const col = frameIndex !== null ? frameIndex % totalCols : 0;
  const row = frameIndex !== null ? Math.floor(frameIndex / totalCols) : 0;
  const backgroundPosition =
    frameIndex === null
      ? "0% 0%"
      : `${(-col * 100) / totalCols}% ${(-row * 100) / totalRows}%`;

  return (
    <div ref={wrapperRef} className={className}>
      {renderStrategy === "webgl" ? (
        <canvas
          className={styles.spriteSheet}
          ref={canvasRef}
          width={frameWidth}
          height={frameHeight}
          style={{
            width: "100%",
            height: "100%",
            display: frameIndex === null ? "none" : "block",
            imageRendering: "pixelated",
          }}
        />
      ) : (
        <div
          className={styles.spriteSheet}
          style={{
            width: "100%",
            height: "100%",
            aspectRatio: `${frameWidth} / ${frameHeight}`,
            backgroundImage: frameIndex === null ? "none" : `url(${src})`,
            backgroundPosition,
            backgroundSize: `${totalCols * 100}% ${Math.ceil(frameCount / totalCols) * 100}%`,
          }}
        />
      )}
    </div>
  );
};

export default SpriteSheetPlayer;
