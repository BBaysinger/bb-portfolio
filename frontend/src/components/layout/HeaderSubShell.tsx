import React from "react";

import styles from "./HeaderSubShell.module.scss";

interface HeaderSubShellProps {
  children: React.ReactNode;
}

const HeaderSubShell: React.FC<HeaderSubShellProps> = ({ children }) => {
  return (
    <>
      <div aria-hidden className={styles.frameClip}>
        <div
          className={`${styles.frameLayerHolder} ${styles.frameLayerHolderOrange}`}
        >
          <span aria-hidden className={styles.frameLayerMasked} />
          <div aria-hidden className={styles.frameLayerFront} />
        </div>
        <div className={styles.frameLayerHolder}>
          <span aria-hidden className={styles.frameLayerMasked} />
          <div aria-hidden className={styles.frameLayerFront} />
        </div>
        <div className={styles.frameLayerHolder}>
          <span aria-hidden className={styles.frameLayerMasked} />
          <div aria-hidden className={styles.frameLayerFront} />
        </div>
      </div>
      <div className={styles.textWrapper}>{children}</div>
    </>
  );
};

export default HeaderSubShell;
