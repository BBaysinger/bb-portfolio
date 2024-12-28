import React from "react";
import { NavLink } from "react-router-dom";
import { useDispatch } from "react-redux";

import { closeMenu, toggleMenu } from "store/menuSlice";
import MiscUtils from "utils/MiscUtils";
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
    <nav className={`${styles["nav"]} ${variant}`} role="navigation">
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

      <ul onClick={closeMenuHandler} className={styles["slideout-nav-buttons"]}>
        <li>
          <NavLink
            to="/portfolio#list"
            className={({ isActive }) =>
              MiscUtils.isActiveOrAlt(isActive, "/", styles["active"])
            }
          >
            Portfolio
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/cv#headerSub"
            className={({ isActive }) => (isActive ? styles["active"] : "")}
          >
            CV
          </NavLink>
        </li>
      </ul>

      <button
        type="button"
        className={styles["navbar-toggle"]}
        onClick={() => dispatch(toggleMenu())}
      >
        <span className={styles["sr-only"]}>Toggle navigation</span>
        <span className={styles["icon-bar"]}></span>
        <span className={styles["icon-bar"]}></span>
        <span className={styles["icon-bar"]}></span>
      </button>
    </nav>
  );
};

export default Nav;
export { NavVariant };
