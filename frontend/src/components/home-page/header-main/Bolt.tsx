import React from "react";

import SpriteSheetPlayer from "components/common/SpriteSheetPlayer";
import styles from "./Bolt.module.scss";

interface BoltProps {
  className?: string;
}

/**
 * Lightning Bolt Component
 *
 * @component
 */
const Bolt: React.FC<BoltProps> = ({ className }) => {
  const src = "/spritesheets/lightning_Layer-Comp-_w480h1098f7.webp";
  return (
    <div className={[styles.bolt, className, "bolt"].join(" ")}>
      <SpriteSheetPlayer
        className={styles.lightning}
        src={src}
        fps={[12, 12, 12, 12, 12, 12, 1000]}
        loops={0}
        randomFrame={true}
      />
    </div>
  );
};

export default Bolt;
