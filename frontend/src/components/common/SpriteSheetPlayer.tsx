import React, { useEffect, useRef, useState } from "react";
import styles from "./SpriteSheetPlayer.module.scss";

interface SpriteSheetPlayerProps {
  src: string;
  frameWidth: number;
  frameHeight: number;
  frameCount: number;
  fps?: number;
  loop?: boolean;
  autoPlay?: boolean;
  onEnd?: () => void;
  className?: string;
  preserveAspectRatio?: boolean;
}

const SpriteSheetPlayer: React.FC<SpriteSheetPlayerProps> = ({
  src,
  frameWidth,
  frameHeight,
  frameCount,
  fps = 30,
  loop = true,
  autoPlay = true,
  onEnd,
  className = "",
  preserveAspectRatio = false,
}) => {
  const [frameIndex, setFrameIndex] = useState(0);
  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());

  useEffect(() => {
    if (!autoPlay) return;

    const frameDuration = 1000 / fps;

    const animate = (now: number) => {
      const elapsed = now - lastTimeRef.current;

      if (elapsed >= frameDuration) {
        lastTimeRef.current = now - (elapsed % frameDuration);

        setFrameIndex((prev) => {
          const next = prev + 1;
          if (next >= frameCount) {
            if (loop) return 0;
            cancelAnimationFrame(animationFrameRef.current!);
            onEnd?.();
            return prev;
          }
          return next;
        });
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [fps, frameCount, loop, autoPlay]);

  const lastIndex = Math.max(frameCount - 1, 1);
  const backgroundPosition = `${(frameIndex * 100) / lastIndex}% 0%`;
  const backgroundSize = `${frameCount * 100}% 100%`;

  return (
    <div
      className={`${styles.spriteSheetPlayer} ${className}`}
      style={{
        backgroundImage: `url(${src})`,
        backgroundPosition,
        backgroundSize,
        ...(preserveAspectRatio && {
          aspectRatio: `${frameWidth} / ${frameHeight}`,
        }),
      }}
    />
  );
};

export default SpriteSheetPlayer;
