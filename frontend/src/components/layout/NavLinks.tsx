"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";

import LogoutButton from "@/components/common/LogoutButton";
import { useAuth } from "@/context/AuthContext";
import MiscUtils from "@/utils/MiscUtils";

import styles from "./Links.module.scss";

interface LinksProps {
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
const Links: React.FC<LinksProps> = ({ onClick, className }) => {
  const pathname = usePathname();
  const { isLoggedIn } = useAuth();

  const isActive = (href: string): string => {
    return MiscUtils.isActiveOrAlt(pathname === href, href, styles.active);
  };

  return (
    <ul onClick={onClick} className={`${styles.navLinks} ${className ?? ""}`}>
      <li>
        <Link href="/#top" className={isActive("/#top")}>
          Home
        </Link>
      </li>
      <li>
        <Link href="/portfolio#list" className={isActive("/portfolio#list")}>
          Portfolio
        </Link>
      </li>
      <li>
        <Link
          href="/cv#top"
          className={pathname === "/cv" ? styles.active : ""}
        >
          CV
        </Link>
      </li>
      <li>
        <Link
          href="/contact#top"
          className={pathname === "/contact" ? styles.active : ""}
        >
          Contact
        </Link>
      </li>

      {isLoggedIn ? (
        <LogoutButton className={styles.logout} />
      ) : (
        <li className={styles.login}>
          <Link
            href="/login#top"
            className={pathname === "/login" ? styles.active : ""}
          >
            Login
          </Link>
        </li>
      )}
    </ul>
  );
};

export default Links;
