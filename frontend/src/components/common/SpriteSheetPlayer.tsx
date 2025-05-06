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
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!autoPlay) return;

    intervalRef.current = setInterval(() => {
      setFrameIndex((prev) => {
        const next = prev + 1;
        if (next >= frameCount) {
          if (loop) return 0;
          clearInterval(intervalRef.current!);
          onEnd?.();
          return prev;
        }
        return next;
      });
    }, 1000 / fps);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fps, frameCount, loop, autoPlay]);

  const backgroundPosition = `${(frameIndex * 100) / frameCount}% 0%`;
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
    >
      <div className={styles.debug}>{backgroundPosition}</div>
    </div>
  );
};

export default SpriteSheetPlayer;
