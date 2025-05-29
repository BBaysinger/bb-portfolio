import React, { useEffect, useState } from "react";

import SpriteSheetPlayer from "components/common/SpriteSheetPlayer";
import styles from "./Ray.module.scss";

interface RayProps {
  className?: string;
  paused?: boolean;
}

const Ray: React.FC<RayProps> = ({ className, paused = true }) => {
  const lightningSrc = "/spritesheets/lightning_Layer-Comp-_w480h1098f7.webp";
  const barSrc = "/spritesheets/bars_w92h300f110.webp";

  const [lightningFrame, setLightningFrame] = useState<number | null>(6);
  const [barsFrame, setBarsFrame] = useState<number | null>(-1);

  const onEnded = () => {
    setLightningFrame(6); // freeze lightning
    setBarsFrame(-1); // hide bars
  };

  useEffect(() => {
    console.log("Ray paused state changed:", paused);
    if (paused) {
      setLightningFrame(-1); // blank both
      setBarsFrame(-1);
    } else {
      setBarsFrame(0); // start playing bars
    }
  }, [paused]);

  return (
    <div className={[styles.ray, className, "ray"].join(" ")}>
      <SpriteSheetPlayer
        className={styles.lightning}
        autoPlay={false}
        src={lightningSrc}
        fps={[12, 12, 12, 12, 12, 12, 1000]}
        loops={0}
        randomFrame={true}
        paused={false}
        frameControl={lightningFrame}
      />
      <SpriteSheetPlayer
        className={styles.bars}
        autoPlay={true}
        src={barSrc}
        loops={1}
        onEnd={onEnded}
        paused={false}
        frameControl={barsFrame}
      />
    </div>
  );
};

export default Ray;
