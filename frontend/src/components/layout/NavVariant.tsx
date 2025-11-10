import clsx from "clsx";
import Link from "next/link";
import React from "react";
import { useDispatch, useSelector } from "react-redux";

import { RawImg } from "@/components/common/RawImg";
import Hamburger from "@/components/layout/Hamburger";
import { RootState } from "@/store/store";
import { closeMobileNav } from "@/store/uiSlice";

import NavLinks from "./NavLinks";
import styles from "./NavVariant.module.scss";

export const NavVariants = {
  TOP_BAR: styles.topBar,
  SLIDE_OUT: styles.slideOut,
} as const;

interface NavProps {
  variant: (typeof NavVariant)[keyof typeof NavVariant];
}

/**
 * Adaptive navigation component with multiple display variants.
 *
 * Renders navigation that adapts between desktop top bar and mobile slide-out
 * menu configurations. Uses different styling variants rather than dynamic
 * switching to maintain performance and avoid layout shifts.
 *
 * Features:
 * - Top bar variant for desktop layouts
 * - Slide-out variant for mobile navigation
 * - Logo and navigation links integration
 * - Redux-connected mobile navigation state
 *
 * @component
 * @param {Object} props - Component props
 * @param {string} props.variant - Navigation display variant (TOP_BAR or SLIDE_OUT)
 * at runtime causes a unbelievably massive frame drop.
 *
 */
const NavVariant: React.FC<NavProps> = ({ variant }) => {
  const isMenuOpen = useSelector(
    (state: RootState) => state.ui.isMobileNavExpanded,
  );

  const dispatch = useDispatch();

  const closeMobileNavHandler = () => {
    if (variant === NavVariants.SLIDE_OUT) {
      dispatch(closeMobileNav());
    }
  };

  return (
    <nav
      className={clsx(styles.navVariant, variant, {
        enabled: isMenuOpen,
        disabled: !isMenuOpen,
      })}
      role="navigation"
    >
      {variant === NavVariants.SLIDE_OUT && (
        <>
          <div className={styles.shadowLayer0}></div>
          <div className={styles.shadowLayer1}></div>
          <div className={styles.shadowLayer2}></div>
        </>
      )}

      <Link href="/#top" className={styles.title}>
        <RawImg
          src={"/images/hero/bb-logo.svg"}
          className={styles.navLogo}
          alt="BB Logo"
        />
        <div className={styles.navLogoText}>
          <div className={styles.name}>
            <span>BRADLEY</span> <span>BAYSINGER</span>
          </div>
          <div>
            <span className={clsx(styles.jobTitle, "nobr")}>
              Interactive UI Developer
            </span>
          </div>
        </div>
      </Link>
      <NavLinks onClick={closeMobileNavHandler} className={styles.navLinks} />

      {variant === NavVariants.TOP_BAR && (
        <Hamburger className={styles.hamburger} />
      )}

      {/* <div className={styles.debug}>
        Current Route: {currentPath} <br />
        {isScrolledToTop ? "Scrolled to Top ✅" : "Scrolled Down ❌"}
      </div>  */}
    </nav>
  );
};

export default NavVariant;
