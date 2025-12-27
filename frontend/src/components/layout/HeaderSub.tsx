import React, { useRef } from "react";

import useAutoFitText from "@/hooks/useAutoFitText";

interface HeaderSubProps {
  head: string;
  subhead?: string;
}

import styles from "./HeaderSub.module.scss";

/**
 * This is the header for every page other than the home page. It takes a parameter
 * for the page title it displays.
 *
 */
const HeaderSub: React.FC<HeaderSubProps> = ({ head, subhead }) => {
  const headerRef = useRef<HTMLElement | null>(null);
  const h1Ref = useRef<HTMLHeadingElement | null>(null);

  useAutoFitText({
    anchorRef: headerRef,
    targetRef: h1Ref,
    watch: head,
    maxLines: 2,
    minFontSizePx: 18,
  });

  return (
    <header
      ref={headerRef}
      id="headerSub"
      className={`${styles.headerSub} ${styles.header}`}
    >
      <div aria-hidden className={styles.frameClip}>
        <span className={`${styles.frameLayer} ${styles.frameLayerOrange}`} />
        <span className={styles.frameLayer} />
        <span className={styles.frameLayer} />
      </div>
      <div className={styles.textWrapper}>
        <h1 ref={h1Ref}>{head}</h1>
        {subhead && <h5 className={styles.subhead}>{subhead}</h5>}
      </div>
    </header>
  );
};

export default HeaderSub;
