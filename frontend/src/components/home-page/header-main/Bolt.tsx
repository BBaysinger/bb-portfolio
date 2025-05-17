import React from "react";

import SpriteSheetPlayer from "components/common/SpriteSheetPlayer";
import styles from "./Bolt.module.scss";

/**
 * Lightning Bolt Component
 *
 * @component
 */
const Bolt: React.FC = ({}) => {
  const src = "/spritesheets/lightning_Layer-Comp-_w500h1160f6.png";
  return (
    <>
      <SpriteSheetPlayer src={src} fps={30} loops={0} />
      <div className={styles.bolt} />
    </>
  );
};

export default Bolt;
