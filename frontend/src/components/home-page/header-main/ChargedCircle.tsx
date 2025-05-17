import React from "react";

import Bolt from "./Bolt";
import styles from "./ChargedCircle.module.scss";

/**
 * ChargedCircle Component
 *
 * @component
 */
const ChargedCircle: React.FC = ({}) => {
  return (
    <div className={styles.chargedCircle}>
      <div className={styles.scaler}>
      <Bolt className={[styles.bolt, styles.bolt1].join(" ")} />
      <Bolt className={[styles.bolt, styles.bolt2].join(" ")} />
      <Bolt className={[styles.bolt, styles.bolt3].join(" ")} />
      </div>
    </div>
  );
};

export default ChargedCircle;
