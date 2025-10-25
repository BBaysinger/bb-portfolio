"use client";

// import Image from "next/image";
// import Link from "next/link";
// import { usePathname } from "next/navigation";
import React from "react";

import { useAuth } from "@/hooks/useAuth";

import styles from "./LogoutButton.module.scss";

interface LogoutButtonProps {
  className?: string;
}

/**
 * Button for logging out of the front end.
 *
 */
const LogoutButton: React.FC<LogoutButtonProps> = ({ className = "" }) => {
  const { logout } = useAuth();
  // const pathname = usePathname();

  // const isActive = pathname === "/login"; // Adjust if needed

  const handleLogout = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent bubbling to parent elements
    logout();
  };

  return (
    <li className={`${styles.logoutButton} ${className} logout`}>
      <button type="button" onClick={handleLogout} className={styles.button}>
        Logout
      </button>
    </li>
  );
};

export default LogoutButton;
