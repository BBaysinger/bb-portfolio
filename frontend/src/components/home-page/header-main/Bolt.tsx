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
  const src = "/spritesheets/lightning_Layer-Comp-_w500h1160f7.webp";
  return (
    <div className={`${styles.bolt} ${className}`}>
      <SpriteSheetPlayer
        className={styles.lightning}
        src={src}
        fps={12}
        loops={0}
        randomFrame={true}
        frameMap={[
          0, 1, 2, 3, 4, 5, 0, 1, 2, 3, 4, 5, 0, 1, 2, 3, 4, 5, 0, 1, 2, 3, 4,
          5, 0, 1, 2, 3, 4, 5, 6,
        ]} // frame 6 is less frequent
      />
      {/* <div className={styles.yellowBolt} /> */}
    </div>
  );
};

export default Bolt;
