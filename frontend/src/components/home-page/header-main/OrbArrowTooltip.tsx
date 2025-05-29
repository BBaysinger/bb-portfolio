import React from "react";

import styles from "./OrbArrowTooltip.module.scss";

type Props = {
  className?: string;
};

const OrbArrowTooltip: React.FC<Props> = ({ className = "" }) => {
  return (
    <div
      className={[`${styles.orbArrowTooltip} orbArrowTooltip`, className].join(
        " ",
      )}
    >
      <div className={styles.tooltipText} />
    </div>
  );
};

export default OrbArrowTooltip;
