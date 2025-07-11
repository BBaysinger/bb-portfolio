import React from "react";
import { NavLink } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";

import { expandMobileNav } from "store/uiSlice";
import Hamburger from "components/layout/Hamburger";
import NavLinks from "./NavLinks";
import { RootState } from "store/store";
import navLogo from "images/misc/bb-logo.svg";
import styles from "./Nav.module.scss";

export const NavVariant = {
  TOP_BAR: styles.topBar,
  SLIDE_OUT: styles.slideOut,
} as const;

interface NavProps {
  variant: (typeof NavVariant)[keyof typeof NavVariant];
}

/**
 * The nav that either gets revealed behind the page content (mobile),
 * or is populated as a bar at the top of the page.
 *
 * @author Bradley Baysinger
 * @since The beginning of time.
 * @version N/A
 */
const Nav: React.FC<NavProps> = ({ variant }) => {
  const isMenuOpen = useSelector(
    (state: RootState) => state.ui.isMobileNavExpanded,
  );

  const dispatch = useDispatch();

  const expandMobileNavHandler = () => {
    if (variant === NavVariant.SLIDE_OUT) {
      dispatch(expandMobileNav());
    }
  };

  return (
    <nav
      className={`${styles.nav} ${variant} ${isMenuOpen ? "enabled" : "disabled"}`}
      role="navigation"
    >
      {variant === NavVariant.SLIDE_OUT && (
        <>
          <div className={styles.shadowLayer0}></div>
          <div className={styles.shadowLayer1}></div>
          <div className={styles.shadowLayer2}></div>
        </>
      )}

      <NavLink to="/#top" className={styles.title}>
        <img src={navLogo} className={styles.navLogo} alt="BB Logo" />
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
      </NavLink>
      <NavLinks onClick={expandMobileNavHandler} className={styles.navLinks} />

      {variant === NavVariant.TOP_BAR && (
        <Hamburger className={styles.hamburger} />
      )}

      {/* <div className={styles.debug}>
        Current Route: {currentPath} <br />
        {isScrolledToTop ? "Scrolled to Top ✅" : "Scrolled Down ❌"}
      </div>  */}
    </nav>
  );
};

export default Nav;
