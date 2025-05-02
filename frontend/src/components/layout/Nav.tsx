import React, { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";

import { closeMobileNav } from "store/uiSlice";
import Hamburger from "components/layout/Hamburger";
import NavLinks from "./NavLinks";
import BarberPole from "components/common/BarberPole";
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
    (state: RootState) => state.ui.isMobileNavOpen,
  );

  // Track if the page is scrolled to the top
  const [isScrolledToTop, setIsScrolledToTop] = useState<boolean>(
    window.scrollY === 0,
  );

  const dispatch = useDispatch();
  const location = useLocation();
  const currentPath = location.pathname;

  const titleClass =
    // TODO: Make so portfolio route isn't enabled when scrolled back up.
    isScrolledToTop && (currentPath === "/" || currentPath === "/portfolio")
      ? `${styles.title} ${styles.homeUnscrolled}`
      : styles.title;

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolledToTop(window.scrollY === 0);
    };

    window.addEventListener("scroll", handleScroll);
    window.addEventListener("orientationchange", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("orientationchange", handleScroll);
    };
  }, []);

  const closeMobileNavHandler = () => {
    if (variant === NavVariant.SLIDE_OUT) {
      dispatch(closeMobileNav());
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

      <NavLink to="/#top" className={titleClass}>
        <img src={navLogo} className={styles.navLogo} alt="BB Logo" />
        <div className={styles.navLogoText}>
          <div className={styles.name}>
            <span>BRADLEY</span> <span>BAYSINGER</span>
          </div>
          <div>
            <span className={"nobr"}>
              Interactive Web <span className={styles.bull}>&bull;</span>{" "}
              Front-end Developer
            </span>
          </div>
        </div>
      </NavLink>
      <NavLinks onClick={closeMobileNavHandler} className={styles.navLinks} />

      {variant === NavVariant.TOP_BAR && (
        <Hamburger className={styles.hamburger} />
      )}

      {/* <div className={styles.debug}>
        Current Route: {currentPath} <br />
        {isScrolledToTop ? "Scrolled to Top ✅" : "Scrolled Down ❌"}
      </div>  */}

      {variant === NavVariant.SLIDE_OUT && (
        <>
          {/* <BarberPole className={styles.barberPole1} paused={!isMenuOpen} />
          <BarberPole className={styles.barberPole2} paused={!isMenuOpen} /> */}
          <BarberPole className={styles.barberPole3} paused={!isMenuOpen} />
        </>
      )}
    </nav>
  );
};

export default Nav;
