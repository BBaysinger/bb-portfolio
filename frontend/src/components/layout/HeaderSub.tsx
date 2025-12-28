import React, { useRef } from "react";

import useAutoFitText from "@/hooks/useAutoFitText";

import styles from "./HeaderSub.module.scss";
import HeaderSubShell from "./HeaderSubShell";

interface HeaderSubProps {
  head: string;
  subhead?: string;
}

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
      <HeaderSubShell>
        <h1 ref={h1Ref}>{head}</h1>
        {subhead && <h5 className={styles.subhead}>{subhead}</h5>}
      </HeaderSubShell>
    </header>
  );
};

export default HeaderSub;
