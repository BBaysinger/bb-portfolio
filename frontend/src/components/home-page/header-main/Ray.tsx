import React, { useEffect, useState } from "react";
import SpriteSheetPlayer from "components/common/SpriteSheetPlayer";
import styles from "./Ray.module.scss";

interface RayProps {
  className?: string;
  isActive?: boolean; // use this instead of paused
}

const Ray: React.FC<RayProps> = ({ className, isActive = false }) => {
  const lightningSrc = "/spritesheets/lightning_Layer-Comp-_w480h1098f7.webp";
  const barSrc = "/spritesheets/bars_w92h300f110.webp";

  const [lightningFrame, setLightningFrame] = useState<number | null>(-1); // hidden
  const [barsFrame, setBarsFrame] = useState<number | null>(-1); // hidden

  const onBarsEnded = () => {
    setLightningFrame(6); // freeze lightning
    setBarsFrame(-1); // hide bars
  };

  useEffect(() => {
    if (!isActive) {
      if (lightningFrame !== -1) setLightningFrame(-1);
      if (barsFrame !== -1) setBarsFrame(-1);
    } else {
      if (barsFrame === -1) setBarsFrame(null); // only resume if it was off
    }
  }, [isActive, lightningFrame, barsFrame]);

  return (
    <div className={[styles.ray, className, "ray"].join(" ")}>
      <SpriteSheetPlayer
        className={styles.lightning}
        autoPlay={false}
        src={lightningSrc}
        fps={[12, 12, 12, 12, 12, 12, 1000]}
        loops={0}
        randomFrame={true}
        frameControl={lightningFrame}
      />
      <SpriteSheetPlayer
        className={styles.bars}
        autoPlay={true}
        src={barSrc}
        loops={1}
        onEnd={onBarsEnded}
        frameControl={barsFrame}
      />
    </div>
  );
};

export default React.memo(Ray);
