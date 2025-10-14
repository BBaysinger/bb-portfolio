"use client";

// import Image from "next/image";
import Link from "next/link";
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
    <li
      className={`${styles.logoutButton} ${className} logout`}
      onClick={handleLogout}
    >
      <Link href="/login#top">
        Logout
        {/* <img
          src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
          alt="Logout"
          width={100}
          height={100}
        /> */}
      </Link>
    </li>
  );
};

export default LogoutButton;
