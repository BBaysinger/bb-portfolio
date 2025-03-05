import React from "react";

import styles from "./LogoutButton.module.scss";

/**
 * @author Bradley Baysinger
 * @since The beginning of time.
 * @version N/A
 */
const LogoutButton: React.FC = () => {
  const isAuthenticated = sessionStorage.getItem("isLoggedIn") === "true";

  if (!isAuthenticated) return null; // Hide button if user is logged out

  const handleLogout = () => {
    sessionStorage.removeItem("isLoggedIn");
    sessionStorage.removeItem("hasDragged");
    window.location.href = "/login";
  };

  return (
    <a
      href="javascript:void(0)"
      className={`${styles["logout"]} logout`}
      onClick={handleLogout}
    >
      <img
        src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
        alt="Logout"
      />
    </a>
  );
};

export default LogoutButton;
