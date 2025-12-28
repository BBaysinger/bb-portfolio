import React from "react";

import styles from "./HeaderSubShell.module.scss";

interface HeaderSubShellProps {
  children: React.ReactNode;
}

const HeaderSubShell: React.FC<HeaderSubShellProps> = ({ children }) => {
  return (
    <>
      <div aria-hidden className={styles.frameClip}>
        <span className={`${styles.frameLayer} ${styles.frameLayerOrange}`} />
        <span className={styles.frameLayer} />
        <span className={styles.frameLayer} />
      </div>
      <div className={styles.textWrapper}>{children}</div>
    </>
  );
};

export default HeaderSubShell;
