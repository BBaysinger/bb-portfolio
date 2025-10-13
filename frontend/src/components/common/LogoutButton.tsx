"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
  const pathname = usePathname();

  const isActive = pathname === "/login"; // Adjust if needed

  const handleLogout = () => {
    logout();
  };

  return (
    <li
      className={`${styles.logoutButton} ${className} logout`}
      onClick={handleLogout}
    >
      <Link href="/login#top" className={isActive ? styles.active : ""}>
        <Image
          src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
          alt="Logout"
          width={1}
          height={1}
        />
      </Link>
    </li>
  );
};

export default LogoutButton;
