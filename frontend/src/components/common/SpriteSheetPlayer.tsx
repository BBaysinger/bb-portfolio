import React, { useEffect, useRef, useState, useMemo } from "react";
import styles from "./SpriteSheetPlayer.module.scss";

interface SpriteSheetPlayerProps {
  src: string;
  autoPlay?: boolean;
  fps?: number | number[];
  loops?: number;
  randomFrame?: boolean;
  onEnd?: () => void;
  frameControl?: number | null;
  className?: string;
  scalerClassName?: string;
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
  scalerClassName = "",
}) => {
  const [frameIndex, setFrameIndex] = useState<number | null>(0);
  const [scale, setScale] = useState(1);

  const wrapperRef = useRef<HTMLDivElement>(null);
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
    if (!meta) return;

    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (frameControl === -1) {
      frameRef.current = -1;
      completedLoopsRef.current = 0;
      setFrameIndex(null);
      return;
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
      (autoPlay && frameControl === null) || // normal animation
      (randomFrame && frameControl === null); // force animation for randomFrame

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
          const maxLoops = loops === 0 ? Infinity : loops;
          if (completedLoopsRef.current >= maxLoops) {
            isCancelled = true;
            onEnd?.();
            return;
          }
        } else {
          const maxLoops = loops === 0 ? Infinity : loops;
          let next = currentIndex + 1;

          if (next >= meta.frameCount) {
            completedLoopsRef.current++;
            if (completedLoopsRef.current >= maxLoops) {
              frameRef.current = meta.frameCount - 1; // stop on last frame
              setFrameIndex(meta.frameCount - 1);
              isCancelled = true;
              onEnd?.();
              return;
            } else {
              next = 0; // continue looping
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
    if (!wrapperRef.current || !meta) return;

    const el = wrapperRef.current;
    const observer = new ResizeObserver(() => {
      const { offsetWidth: w, offsetHeight: h } = el;
      const scaleX = w / meta.frameWidth;
      const scaleY = h / meta.frameHeight;
      setScale(Math.max(scaleX, scaleY));
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, [meta]);

  if (!meta) return null;

  const { frameWidth, frameHeight, frameCount } = meta;
  const columns = Math.min(frameCount, Math.floor(4096 / frameWidth));
  const col = frameIndex !== null ? frameIndex % columns : 0;
  const row = frameIndex !== null ? Math.floor(frameIndex / columns) : 0;

  const backgroundPosition =
    frameIndex === null
      ? "0 0"
      : `-${Math.round(col * frameWidth)}px -${Math.round(row * frameHeight)}px`;
  const sheetWidth = Math.round(columns * frameWidth);
  const sheetHeight = Math.round(Math.ceil(frameCount / columns) * frameHeight);

  return (
    <div
      ref={wrapperRef}
      className={[styles.spriteSheetWrapper, className].join(" ")}
    >
      <div
        className={[
          styles.spriteSheetScaler,
          scalerClassName,
          frameIndex === null ? styles.empty : "",
        ].join(" ")}
        style={{
          width: `${frameWidth}px`,
          height: `${frameHeight}px`,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          backgroundImage: frameIndex === null ? "none" : `url(${src})`,
          backgroundPosition,
          backgroundSize: `${sheetWidth}px ${sheetHeight}px`,
        }}
      />
    </div>
  );
};

export default SpriteSheetPlayer;
