import React from "react";
import { NavLink } from "react-router-dom";
import { useDispatch } from "react-redux";

import { closeMenu } from "store/menuSlice";
import MiscUtils from "utils/MiscUtils";
import styles from "./Nav.module.scss";

const NavVariant = {
  TOP_BAR: "top-bar",
  SLIDE_OUT: "slide-out",
} as const;

interface NavProps {
  variant: (typeof NavVariant)[keyof typeof NavVariant];
}

/**
 * This is the mobile nav that appears to populate behind the page content.
 *
 * @author Bradley Baysinger
 * @since The beginning of time.
 * @version N/A
 */
const Nav: React.FC<NavProps> = ({}) => {
  const dispatch = useDispatch();

  return (
    <nav className={styles["slideout-nav"]} role="navigation">
      <ul
        onClick={() => dispatch(closeMenu())}
        className={styles["slideout-nav-buttons"]}
      >
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
            to="/cv#top"
            className={({ isActive }) => (isActive ? styles["active"] : "")}
          >
            CV
          </NavLink>
        </li>
      </ul>
    </nav>
  );
};

export default Nav;
export { NavVariant };
