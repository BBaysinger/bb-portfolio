import React from "react";
import { NavLink } from "react-router-dom";

import MiscUtils from "utils/MiscUtils";
import styles from "./NavLinks.module.scss";

interface NavLinkProps {
  onClick?: () => void;
}

/**
 * Navigation link list populated around the site.
 *
 * @author Bradley Baysinger
 * @since The beginning of time.
 * @version N/A
 */
const NavLinks: React.FC<NavLinkProps> = ({ onClick }) => {
  return (
    <ul onClick={onClick} className={styles["nav-links"]}>
      <li>
        <NavLink
          to="/"
          className={({ isActive }) =>
            MiscUtils.isActiveOrAlt(isActive, "/", styles["active"])
          }
        >
          Home
        </NavLink>
      </li>
      <li>
        <NavLink
          to="/portfolio#list"
          className={({ isActive }) =>
            MiscUtils.isActiveOrAlt(
              isActive,
              "/portfolio#list",
              styles["active"],
            )
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
  );
};

export default NavLinks;
