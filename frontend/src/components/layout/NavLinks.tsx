import React from "react";
import { NavLink } from "react-router-dom";

import { useAuth } from "context/AuthContext";
import MiscUtils from "utils/MiscUtils";
import styles from "./NavLinks.module.scss";
import LogoutButton from "components/common/LogoutButton";

interface NavLinkProps {
  onClick?: () => void;
  className?: string;
}

/**
 * Navigation link list populated around the site.
 *
 * @author Bradley Baysinger
 * @since The beginning of time.
 * @version N/A
 */
const NavLinks: React.FC<NavLinkProps> = ({ onClick, className }) => {
  const { isLoggedIn } = useAuth();

  return (
    <ul onClick={onClick} className={`${styles["nav-links"]} ${className}`}>
      {isLoggedIn && (
        <>
          <li>
            <NavLink
              to="/#top"
              className={({ isActive }) =>
                MiscUtils.isActiveOrAlt(isActive, "/#top", styles.active)
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
                  styles.active,
                )
              }
            >
              Portfolio
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/cv#top"
              className={({ isActive }) => (isActive ? styles.active : "")}
            >
              CV
            </NavLink>
          </li>
        </>
      )}
      <li>
        <NavLink
          to="/contact#top"
          className={({ isActive }) => (isActive ? styles.active : "")}
        >
          Contact
        </NavLink>
      </li>
      {isLoggedIn && <LogoutButton className={styles["logout"]} />}
      {!isLoggedIn && (
        <li>
          <NavLink
            to="/login#top"
            className={({ isActive }) => (isActive ? styles.active : "")}
          >
            Login
          </NavLink>
        </li>
      )}
    </ul>
  );
};

export default NavLinks;
