"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

import { useAuth } from "@/context/AuthContext";
import styles from "./LogoutButton.module.scss";

interface LogoutButtonProps {
  className?: string;
}

/**
 * Button for logging out of the front end.
 *
 * @author Bradley Baysinger
 * @since The beginning of time.
 * @version N/A
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
      className={`${styles.logout} ${className} logout`}
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
