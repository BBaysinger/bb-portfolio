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
}

const SpriteSheetPlayer: React.FC<SpriteSheetPlayerProps> = ({
  src,
  frameWidth,
  frameCount,
  fps = 30,
  loop = true,
  autoPlay = true,
  onEnd,
  className = "",
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

  const offsetX = -(frameIndex * frameWidth);

  return (
    <div
      className={`${styles.spriteSheetPlayer} ${className}`}
      style={{
        backgroundImage: `url(${src})`,
        backgroundPosition: `${offsetX}px 0`,
      }}
    >
      <div className={styles.debug}>{offsetX}</div>
    </div>
  );
};

export default SpriteSheetPlayer;
