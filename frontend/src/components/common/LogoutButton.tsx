import React from "react";
import { useNavigate } from "react-router-dom";

import styles from "./LogoutButton.module.scss";

/**
 * @author Bradley Baysinger
 * @since The beginning of time.
 * @version N/A
 */
const LogoutButton: React.FC = () => {
  const isAuthenticated = sessionStorage.getItem("isLoggedIn") === "true";
  const navigate = useNavigate(); // Get the navigate function from useNavigate

  if (!isAuthenticated) return null; // Hide button if user is logged out

  const handleLogout = () => {
    sessionStorage.removeItem("isLoggedIn");
    // Reset everything, so user gets the same experience on the next login
    sessionStorage.removeItem("hasDragged");
    sessionStorage.removeItem("hasScrolledOut");

    navigate("/login");
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
