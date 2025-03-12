import React from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "context/AuthContext";
import styles from "./LogoutButton.module.scss";

/**
 * @author Bradley Baysinger
 * @since The beginning of time.
 * @version N/A
 */
const LogoutButton: React.FC = () => {
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
    <button className={`${styles["logout"]} logout`} onClick={handleLogout}>
      <img
        src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
        alt="Logout"
      />
    </button>
  );
};

export default LogoutButton;
