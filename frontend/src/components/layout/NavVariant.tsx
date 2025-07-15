import Image from "next/image";
import Link from "next/link";
import React from "react";
import { useDispatch, useSelector } from "react-redux";

import Hamburger from "@/components/layout/Hamburger";
import navLogo from "@/images/misc/bb-logo.svg";
import { RootState } from "@/store/store";
import { expandMobileNav } from "@/store/uiSlice";

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
 * The nav that either gets revealed behind the page content (mobile),
 * or is populated as a bar at the top of the page (desktop). Styled uniquely
 * for either variant, but used twice, as switching between them dynamically
 * at runtime causes a unbelievably massive frame drop.
 *
 * @author Bradley Baysinger
 * @since The beginning of time.
 * @version N/A
 */
const NavVariant: React.FC<NavProps> = ({ variant }) => {
  const isMenuOpen = useSelector(
    (state: RootState) => state.ui.isMobileNavExpanded,
  );

  const dispatch = useDispatch();

  const expandMobileNavHandler = () => {
    if (variant === NavVariants.SLIDE_OUT) {
      dispatch(expandMobileNav());
    }
  };

  return (
    <nav
      className={`${styles.navVariant} ${variant} ${isMenuOpen ? "enabled" : "disabled"}`}
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
        <Image src={navLogo} className={styles.navLogo} alt="BB Logo" />
        <div className={styles.navLogoText}>
          <div className={styles.name}>
            <span>BRADLEY</span> <span>BAYSINGER</span>
          </div>
          <div>
            <span className={[styles.jobTitle, "nobr"].join(" ")}>
              Interactive UI Developer
            </span>
          </div>
        </div>
      </Link>
      <NavLinks onClick={expandMobileNavHandler} className={styles.navLinks} />

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
