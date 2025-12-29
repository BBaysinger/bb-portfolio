import React from "react";

import styles from "./HeaderSubSign.module.scss";

interface HeaderSubSignProps {
  children: React.ReactNode;
}

const HeaderSubSign: React.FC<HeaderSubSignProps> = ({ children }) => {
  return (
    <>
      <div aria-hidden className={styles.frameClip}>
        <div
          className={`${styles.frameLayerHolder} ${styles.frameLayerHolderOrange}`}
        >
          <span aria-hidden className={styles.frameLayerMasked} />
        </div>
        <div className={styles.frameLayerHolder}>
          <span aria-hidden className={styles.frameLayerMasked} />
        </div>
        <div className={styles.frameLayerHolder}>
          <span aria-hidden className={styles.frameLayerMasked} />
        </div>
      </div>
      <div className={styles.textWrapper}>{children}</div>
      <div aria-hidden className={styles.nutsOverlay}>
        <div
          className={`${styles.frameLayerHolder} ${styles.frameLayerHolderOrange}`}
        >
          <div aria-hidden className={styles.frameLayerFront} />
        </div>
        <div className={styles.frameLayerHolder}>
          <div aria-hidden className={styles.frameLayerFront} />
        </div>
        <div className={styles.frameLayerHolder}>
          <div aria-hidden className={styles.frameLayerFront} />
        </div>
      </div>
    </>
  );
};

export default HeaderSubSign;
