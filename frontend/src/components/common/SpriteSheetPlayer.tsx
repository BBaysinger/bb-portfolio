import React, { useEffect, useRef, useState, useMemo } from "react";
import styles from "./SpriteSheetPlayer.module.scss";

interface SpriteSheetPlayerProps {
  src: string; // filename must follow pattern: name_w16h12f82r10l1.webp
  autoPlay?: boolean;
  fps?: number; // ✅ Optional override
  onEnd?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

const SpriteSheetPlayer: React.FC<SpriteSheetPlayerProps> = ({
  src,
  autoPlay = true,
  fps,
  onEnd,
  className = "",
  style,
}) => {
  const [frameIndex, setFrameIndex] = useState(0);
  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());

  // Parse metadata from filename
  const meta = useMemo(() => {
    const match = src.match(/_w(\d+)h(\d+)f(\d+)r(\d+)l(\d+)/);
    if (!match) {
      console.warn("Invalid sprite filename format:", src);
      return null;
    }

    const [, w, h, f, r, l] = match.map(Number);
    return {
      frameWidth: w,
      frameHeight: h,
      frameCount: f,
      fps: r,
      loopCount: l, // 0 = infinite
    };
  }, [src]);

  useEffect(() => {
    if (!autoPlay || !meta) return;

    let isCancelled = false;
    let currentFrame = 0;
    let completedLoops = 0;
    const frameDuration = 1000 / (fps ?? meta.fps);
    lastTimeRef.current = performance.now();

    const animate = (now: number) => {
      if (isCancelled) return;

      const elapsed = now - lastTimeRef.current;

      if (elapsed >= frameDuration) {
        lastTimeRef.current = now - (elapsed % frameDuration);
        currentFrame += 1;

        if (currentFrame >= meta.frameCount) {
          completedLoops += 1;

          // If loopCount is 0, it means infinite
          const maxLoops = meta.loopCount === 0 ? Infinity : meta.loopCount;

          if (completedLoops >= maxLoops) {
            isCancelled = true;
            setFrameIndex(meta.frameCount - 1); // stay on last frame
            onEnd?.();
            return;
          }

          currentFrame = 0; // reset for next loop
        }

        setFrameIndex(currentFrame);
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
      }
    };
  }, [meta, fps, autoPlay, onEnd]);

  useEffect(() => {
    if (autoPlay) {
      setFrameIndex(0);
    }
  }, [autoPlay, src]);

  if (!meta) {
    console.warn("Failed to extract meta from", src);
    return null;
  }

  const { frameWidth, frameHeight, frameCount } = meta;

  const columns = Math.min(frameCount, Math.floor(4096 / frameWidth));
  const col = frameIndex % columns;
  const row = Math.floor(frameIndex / columns);

  const backgroundPosition = `-${col * frameWidth}px -${row * frameHeight}px`;
  const sheetWidth = columns * frameWidth;
  const sheetHeight = Math.ceil(frameCount / columns) * frameHeight;

  return (
    <div
      className={`${styles.spriteSheetPlayer} ${className}`}
      style={{
        ...style,
        backgroundImage: `url(${src})`,
        backgroundPosition,
        backgroundSize: `${sheetWidth}px ${sheetHeight}px`,
      }}
    />
  );
};

export default SpriteSheetPlayer;
