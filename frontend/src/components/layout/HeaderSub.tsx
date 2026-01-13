import clsx from "clsx";
import React, { useRef } from "react";

import useAutoFitText from "@/hooks/useAutoFitText";

import styles from "./HeaderSub.module.scss";
import HeaderSubSign from "./HeaderSubSign";

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
  const headTextRef = useRef<HTMLSpanElement | null>(null);

  useAutoFitText({
    anchorRef: headerRef,
    targetRef: headTextRef,
    watch: head,
    maxLines: 1,
    minFontSizePx: 18,
  });

  return (
    <header
      ref={headerRef}
      id="headerSub"
      className={clsx(styles.headerSub, styles.header)}
    >
      <HeaderSubSign>
        <h1>
          <span ref={headTextRef} className={styles.headText}>
            {head}
          </span>
        </h1>
        {subhead && <h5 className={styles.subhead}>{subhead}</h5>}
      </HeaderSubSign>
    </header>
  );
};

export default HeaderSub;
