import React from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "context/AuthContext";
import styles from "./LogoutButton.module.scss";

/**
 * @author Bradley Baysinger
 * @since The beginning of time.
 * @version N/A
 */

interface LogoutButtonProps {
  className?: string;
}

const LogoutButton: React.FC<LogoutButtonProps> = ({ className = "" }) => {
  const navigate = useNavigate(); // Get the navigate function from useNavigate
  const { logout } = useAuth();

  const handleLogout = () => {
    // Reset everything, so user gets the same experience on the next login
    sessionStorage.removeItem("hasDragged");
    sessionStorage.removeItem("hasScrolledOut");

    logout();
    navigate("/login#top");
  };

  return (
    <li className={`${styles["logout"]} ${className}`} onClick={handleLogout}>
      <img
        src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
        alt="Logout"
      />
    </li>
  );
};

export default LogoutButton;
