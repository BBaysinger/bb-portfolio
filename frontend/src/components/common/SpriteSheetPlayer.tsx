import React, { useEffect, useRef, useState, useMemo } from "react";
import styles from "./SpriteSheetPlayer.module.scss";

interface SpriteSheetPlayerProps {
  src: string; // filename must follow pattern: name_w16h12f82r10l1.webp
  autoPlay?: boolean;
  fps?: number | number[]; // Supports constant or per-frame FPS
  loops?: number;
  randomFrame?: boolean;
  onEnd?: () => void;
  className?: string;
  scalerClassName?: string;
}

const SpriteSheetPlayer: React.FC<SpriteSheetPlayerProps> = ({
  src,
  autoPlay = true,
  fps = 30,
  loops = 0, // Default zero so it's easier to identify on screen
  randomFrame = false,
  onEnd,
  className = "",
  scalerClassName = "",
}) => {
  const [frameIndex, setFrameIndex] = useState(0);
  const [scale, setScale] = useState(1);
  // Scaled with CSS then used detect size changes and apply it via transform: scale to
  // the visual output element for GPU acceleration
  const wrapperRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());
  const frameRef = useRef(0); // ✅ persists across renders

  // Extract metadata from filename
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
    if (!meta || !autoPlay) return;

    let isCancelled = false;
    lastTimeRef.current = performance.now();
    frameRef.current = 0;
    let completedLoops = 0;

    const getDuration = (index: number): number => {
      if (Array.isArray(fps)) {
        return 1000 / (fps[index % fps.length] || 30);
      }
      return 1000 / (fps || 30);
    };

    const animate = (now: number) => {
      if (isCancelled) return;

      const elapsed = now - lastTimeRef.current;
      const duration = getDuration(frameRef.current);

      if (elapsed >= duration) {
        lastTimeRef.current = now - (elapsed % duration);

        if (randomFrame) {
          const random = Math.floor(Math.random() * meta.frameCount);
          setFrameIndex(random);
          frameRef.current = random;
        } else {
          frameRef.current = (frameRef.current + 1) % meta.frameCount;

          if (frameRef.current === 0) {
            completedLoops += 1;
            const maxLoops = loops === 0 ? Infinity : loops;
            if (completedLoops >= maxLoops) {
              isCancelled = true;
              onEnd?.();
              setFrameIndex(meta.frameCount - 1);
              return;
            }
          }

          setFrameIndex(frameRef.current);
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
      }
    };
  }, [meta, fps, autoPlay, loops, randomFrame, onEnd]);

  useEffect(() => {
    if (!wrapperRef.current || !meta) return;

    const el = wrapperRef.current;
    const observer = new ResizeObserver(() => {
      const { offsetWidth: w, offsetHeight: h } = el;
      const scaleX = w / meta.frameWidth;
      const scaleY = h / meta.frameHeight;
      const finalScale = Math.max(scaleX, scaleY);
      setScale(finalScale);
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, [meta]);

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
      ref={wrapperRef}
      className={[styles.spriteSheetWrapper, className].join(" ")}
    >
      <div
        className={[styles.spriteSheetScaler, scalerClassName].join(" ")}
        style={{
          width: `${frameWidth}px`,
          height: `${frameHeight}px`,
          transform: `scale(${scale})`,
          backgroundImage: `url(${src})`,
          backgroundPosition,
          backgroundSize: `${sheetWidth}px ${sheetHeight}px`,
        }}
      />
    </div>
  );
};

export default SpriteSheetPlayer;
