import React from "react";
import { NavLink } from "react-router-dom";

import { useAuth } from "context/AuthContext";
import styles from "./LogoutButton.module.scss";

/**
 * @author Bradley Baysinger
 * @since The beginning of time.
 * @version N/A
 */

interface LogoutButtonProps {
  className?: string | ((props: { isActive: boolean }) => string);
}

const LogoutButton: React.FC<LogoutButtonProps> = ({ className = "" }) => {
  const { logout } = useAuth();

  const handleLogout = () => {
    // Reset everything, so user gets the same experience on the next login
    sessionStorage.removeItem("hasDragged");
    sessionStorage.removeItem("hasScrolledOut");

    logout();
  };

  return (
    <li
      className={`${styles.logout} ${className} logout`}
      onClick={handleLogout}
    >
      <NavLink
        className={({ isActive }) => (isActive ? styles.active : "")}
        to="/login#top"
      >
        <img
          src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
          alt="Logout"
        />
      </NavLink>
    </li>
  );
};

export default LogoutButton;
