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
  const src = "/spritesheets/lightning_Layer-Comp-_w500h1160f6.png";
  return (
    <div className={`${styles.bolt} ${className}`}>
      <SpriteSheetPlayer src={src} fps={30} loops={0} />
      <div className={styles.yellowBolt} />
    </div>
  );
};

export default Bolt;
