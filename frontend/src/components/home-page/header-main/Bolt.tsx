import React from "react";

import SpriteSheetPlayer from "components/common/SpriteSheetPlayer";
import styles from "./Bolt.module.scss";

/**
 * Lightning Bolt Component
 *
 * @component
 */
const Bolt: React.FC = ({}) => {
  const src = "/spritesheets/blue-lightning_Layer-Comp-_w16h12f6.webp";
  return (
    <>
      <SpriteSheetPlayer src={src} fps={30} loops={0} />
      <div className={styles.bolt} />
    </>
  );
};

export default Bolt;
