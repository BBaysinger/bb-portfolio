import React from "react";
import { NavLink } from "react-router-dom";

import { useAuth } from "context/AuthContext";
import MiscUtils from "utils/MiscUtils";
import styles from "./NavLinks.module.scss";
import type { NavLinkProps } from "react-router-dom"; // ✅ external
import LogoutButton from "components/common/LogoutButton";

interface NavLinksProps {
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
const NavLinks: React.FC<NavLinksProps> = ({ onClick, className }) => {
  const { isLoggedIn } = useAuth();

  return (
    <ul onClick={onClick} className={`${styles.navLinks} ${className}`}>
      {/* {isLoggedIn && ( */}
      <>
        <li>
          <NavLink
            to="/#top"
            className={({ isActive }: NavLinkProps) =>
              MiscUtils.isActiveOrAlt(isActive, "/#top", styles.active)
            }
          >
            Home
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/portfolio#list"
            className={({ isActive }: NavLinkProps) =>
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
            className={({ isActive }: NavLinkProps) =>
              isActive ? styles.active : ""
            }
          >
            CV
          </NavLink>
        </li>
      </>
      {/* )} */}
      <li>
        <NavLink
          to="/contact#top"
          className={({ isActive }: NavLinkProps) =>
            isActive ? styles.active : ""
          }
        >
          Contact
        </NavLink>
      </li>
      {isLoggedIn && <LogoutButton className={styles.logout} />}
      {!isLoggedIn && (
        <li className={styles.login}>
          <NavLink
            to="/login#top"
            className={({ isActive }: NavLinkProps) =>
              isActive ? styles.active : ""
            }
          >
            Login
          </NavLink>
        </li>
      )}
    </ul>
  );
};

export default NavLinks;
