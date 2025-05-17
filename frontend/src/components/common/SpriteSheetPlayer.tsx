import React, { useEffect, useRef, useState, useMemo } from "react";
import styles from "./SpriteSheetPlayer.module.scss";

interface SpriteSheetPlayerProps {
  src: string;
  autoPlay?: boolean;
  fps?: number | number[]; // constant FPS or per-frame
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
  loops = 0,
  randomFrame = false,
  onEnd,
  className = "",
  scalerClassName = "",
}) => {
  const [frameIndex, setFrameIndex] = useState(0);
  const [scale, setScale] = useState(1);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());
  const frameRef = useRef<number>(0);
  const completedLoopsRef = useRef<number>(0);
  const stableFpsRef = useRef(fps);
  const frameDurationsRef = useRef<number[]>([]);

  useEffect(() => {
    stableFpsRef.current = fps;
  }, [fps]);

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
    const safeFps = stableFpsRef.current;

    const newDurations = Array.from({ length: count }, (_, i) => {
      const val = Array.isArray(safeFps) ? safeFps[i % safeFps.length] || 30 : safeFps || 30;
      return 1000 / val;
    });

    frameDurationsRef.current = newDurations;
  }, [meta]);

  useEffect(() => {
    if (!meta || !autoPlay || frameDurationsRef.current.length === 0) return;

    let isCancelled = false;
    lastTimeRef.current = performance.now();
    frameRef.current = 0;
    completedLoopsRef.current = 0;

    const animate = (now: number) => {
      if (isCancelled || !meta) return;

      const elapsed = now - lastTimeRef.current;
      const currentIndex = frameRef.current;
      const duration = frameDurationsRef.current[currentIndex] || 1000 / 30;

      if (elapsed >= duration) {
        lastTimeRef.current = now - (elapsed % duration);

        if (randomFrame) {
          const random = Math.floor(Math.random() * meta.frameCount);
          frameRef.current = random;
          setFrameIndex(random);
        } else {
          const next = (currentIndex + 1) % meta.frameCount;
          frameRef.current = next;

          if (next === 0) {
            completedLoopsRef.current += 1;
            const maxLoops = loops === 0 ? Infinity : loops;
            if (completedLoopsRef.current >= maxLoops) {
              isCancelled = true;
              onEnd?.();
              setFrameIndex(meta.frameCount - 1);
              return;
            }
          }

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
      }
    };
  }, [meta, autoPlay, loops, randomFrame, onEnd]);

  useEffect(() => {
    if (!wrapperRef.current || !meta) return;

    const el = wrapperRef.current;
    const observer = new ResizeObserver(() => {
      requestIdleCallback(() => {
        const { offsetWidth: w, offsetHeight: h } = el;
        const scaleX = w / meta.frameWidth;
        const scaleY = h / meta.frameHeight;
        const finalScale = Math.round(Math.max(scaleX, scaleY) * 1000) / 1000;
        setScale(finalScale);
      });
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, [meta]);

  if (!meta) return null;

  const { frameWidth, frameHeight, frameCount } = meta;
  const columns = Math.min(frameCount, Math.floor(4096 / frameWidth));
  const col = frameIndex % columns;
  const row = Math.floor(frameIndex / columns);

  const backgroundPosition = `-${Math.round(col * frameWidth)}px -${Math.round(row * frameHeight)}px`;
  const sheetWidth = Math.round(columns * frameWidth);
  const sheetHeight = Math.round(Math.ceil(frameCount / columns) * frameHeight);

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
          transformOrigin: "top left",
          backgroundImage: `url(${src})`,
          backgroundPosition,
          backgroundSize: `${sheetWidth}px ${sheetHeight}px`,
        }}
      />
    </div>
  );
};

export default SpriteSheetPlayer;
