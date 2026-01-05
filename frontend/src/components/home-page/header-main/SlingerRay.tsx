import clsx from "clsx";
import React, { useEffect, useState } from "react";

import SpriteSheetPlayer from "@/components/common/sprite-rendering/SpriteSheetPlayer";

import styles from "./SlingerRay.module.scss";

interface SlingerRayProps {
  className?: string;
  isActive?: boolean; // use this instead of paused
}

/**
 * The rays of energy that radiate out from the Slinger orb.
 * This handles both the lightning effect and the energy bars
 * as separate sprite sheets.
 *
 */
const SlingerRay: React.FC<SlingerRayProps> = ({
  className,
  isActive = false,
}) => {
  const lightningSrc = "/spritesheets/lightning_Layer-Comp-_w480h1098f7.webp";
  const energyBarSrc = "/spritesheets/energy-bars_w92h300f110.webp";

  const [lightningFrame, setLightningFrame] = useState<number | null>(-1); // hidden
  const [energyBarsFrame, setEnergyBarsFrame] = useState<number | null>(-1); // hidden

  const onBarsEnded = () => {
    setEnergyBarsFrame(-1); // hide energy bars
    // Start lightning immediately. Previously we used a timeout to force a distinct
    // intermediate frameControl value, but that also introduced a visible gap.
    setLightningFrame(null);
  };

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (isActive) {
        setEnergyBarsFrame(null); // start/resume energy bars
        setLightningFrame(-1); // make sure lightning is hidden until energy bars finish
      } else {
        setLightningFrame(-1); // hide lightning
        setEnergyBarsFrame(-1); // hide energy bars
      }
    });

    return () => cancelAnimationFrame(frame);
  }, [isActive]);

  return (
    <div className={clsx(styles.slingerRay, className, "slingerRay")}>
      <SpriteSheetPlayer
        // renderStrategy="css"
        className={styles.lightning}
        autoPlay={false}
        src={lightningSrc}
        fps={[12, 12, 12, 12, 12, 12, 1000]}
        loops={0}
        randomFrame={true}
        frameControl={lightningFrame}
      />
      <SpriteSheetPlayer
        className={styles.energyBars}
        // renderStrategy="css"
        autoPlay={true}
        src={energyBarSrc}
        loops={1}
        onEnd={onBarsEnded}
        frameControl={energyBarsFrame}
      />
    </div>
  );
};

export default React.memo(SlingerRay);
