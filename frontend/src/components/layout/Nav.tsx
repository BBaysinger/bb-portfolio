import React, { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";

import { closeMenu } from "store/menuSlice";
import Hamburger from "components/layout/Hamburger";
import NavLinks from "./NavLinks";
import BarberPole from "components/common/BarberPole";
import { RootState } from "store/store";
import navLogo from "images/misc/bb-logo.svg";
import styles from "./Nav.module.scss";

export const NavVariant = {
  TOP_BAR: styles["top-bar"],
  SLIDE_OUT: styles["slide-out"],
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
  const isMenuOpen = useSelector((state: RootState) => state.menu.isOpen);

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
      ? `${styles["title"]} ${styles["home-unscrolled"]}`
      : styles["title"];

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

  const closeMenuHandler = () => {
    if (variant === NavVariant.SLIDE_OUT) {
      dispatch(closeMenu());
    }
  };

  return (
    <nav
      className={`${styles["nav"]} ${variant} ${isMenuOpen ? "enabled" : "disabled"}`}
      role="navigation"
    >
      {variant === NavVariant.SLIDE_OUT && (
        <>
          <div className={styles["shadow-layer0"]}></div>
          <div className={styles["shadow-layer1"]}></div>
          <div className={styles["shadow-layer2"]}></div>
        </>
      )}

      <NavLink to="/#top" className={titleClass}>
        <img src={navLogo} className={styles["nav-logo"]} alt="BB Logo" />
        <div className={styles["nav-logo-text"]}>
          <div className={styles["name"]}>
            <span>BRADLEY</span> <span>BAYSINGER</span>
          </div>
          <div>
            <span className={"nobr"}>
              Interactive Web <span className={styles["bull"]}>&bull;</span>{" "}
              Front-end Developer
            </span>
          </div>
        </div>
      </NavLink>
      <NavLinks onClick={closeMenuHandler} className={styles["nav-links"]} />

      {variant === NavVariant.TOP_BAR && (
        <Hamburger className={styles["hamburger"]} />
      )}

      {/* <div className={styles["debug"]}>
        Current Route: {currentPath} <br />
        {isScrolledToTop ? "Scrolled to Top ✅" : "Scrolled Down ❌"}
      </div>  */}

      {variant === NavVariant.SLIDE_OUT && (
        <>
          {/* <BarberPole className={styles["barber-pole1"]} paused={!isMenuOpen} />
          <BarberPole className={styles["barber-pole2"]} paused={!isMenuOpen} /> */}
          <BarberPole className={styles["barber-pole3"]} paused={!isMenuOpen} />
        </>
      )}
    </nav>
  );
};

export default Nav;
