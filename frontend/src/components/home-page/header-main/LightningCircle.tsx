import React from "react";

import Bolt from "./Bolt";
import styles from "./Lightning.module.scss";

/**
 * LightningCircle Component
 *
 * @component
 */
const LightningCircle: React.FC = ({}) => {
  return (
    <div className={styles.lightning}>
      <Bolt />
      <Bolt />
      <Bolt />
    </div>
  );
};

export default LightningCircle;
