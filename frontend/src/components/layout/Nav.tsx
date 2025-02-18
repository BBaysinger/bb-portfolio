import React from "react";
import { NavLink } from "react-router-dom";
import { useDispatch } from "react-redux";

import { closeMenu } from "store/menuSlice";
import Hamburger from "components/layout/Hamburger";
import NavLinks from "./NavLinks";
import BarberPole from "components/common/BarberPole";
import navLogo from "images/misc/bb-logo.svg";
import styles from "./Nav.module.scss";

const NavVariant = {
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
  const dispatch = useDispatch();

  const closeMenuHandler = () => {
    if (variant === NavVariant.SLIDE_OUT) {
      dispatch(closeMenu());
    }
  };

  return (
    <nav className={`${styles["nav"]} ${variant} nav`} role="navigation">
      <div className={styles["effect-layer0"]}></div>
      <div className={styles["effect-layer1"]}></div>
      <div className={styles["effect-layer2"]}></div>
      <NavLink to="/#headerMain" className={styles["title"]}>
        <img src={navLogo} className={styles["nav-logo"]} alt="BB Logo" />
        <div className={styles["nav-logo-text"]}>
          <div className={styles["name"]}>
            <span>BRADLEY</span> <span>BAYSINGER</span>
          </div>
          <div>
            <span className={styles["nobr"]}>
              Interactive Web <span className={styles["bull"]}>&bull;</span>{" "}
              Front-end Developer
            </span>
          </div>
        </div>
      </NavLink>
      <NavLinks onClick={closeMenuHandler} />

      {variant === NavVariant.TOP_BAR && <Hamburger />}

      {variant === NavVariant.SLIDE_OUT && (
        <>
          <BarberPole className={styles["barber-pole1"]} />
          <BarberPole className={styles["barber-pole2"]} />
          <BarberPole className={styles["barber-pole3"]} />
        </>
      )}
    </nav>
  );
};

export default Nav;
export { NavVariant };
