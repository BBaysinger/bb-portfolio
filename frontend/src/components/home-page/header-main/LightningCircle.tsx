import React from "react";

import Bolt from "./Bolt";
import styles from "./LightningCircle.module.scss";

/**
 * LightningCircle Component
 *
 * @component
 */
const LightningCircle: React.FC = ({}) => {
  return (
    <div className={styles.lightningCircle}>
      <Bolt />
      <Bolt />
      <Bolt />
    </div>
  );
};

export default LightningCircle;
