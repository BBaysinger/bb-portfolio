"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useEffect, useState } from "react";

import LogoutButton from "@/components/common/LogoutButton";
import { useAuth } from "@/context/AuthContext";
import MiscUtils from "@/utils/MiscUtils";

import styles from "./NavLinks.module.scss";

interface LinksProps {
  onClick?: () => void;
  className?: string;
}

/**
 * Navigation link list populated around the site, like nav variants and footer.
 *
 * @author Bradley Baysinger
 * @since The beginning of time.
 * @version N/A
 */
const Links: React.FC<LinksProps> = ({ onClick, className }) => {
  const pathname = usePathname();
  const { isLoggedIn } = useAuth();

  const [currentHash, setCurrentHash] = useState("");

  useEffect(() => {
    const updateHash = () => setCurrentHash(window.location.hash);
    updateHash(); // run once on mount

    window.addEventListener("hashchange", updateHash);
    return () => window.removeEventListener("hashchange", updateHash);
  }, []);

  const fullPath = `${pathname}${currentHash}`;

  const isActive = (target: string) => {
    return MiscUtils.isActiveOrAlt(fullPath === target, target, styles.active);
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
        <Link href="/cv#top" className={isActive("/cv#top")}>
          CV
        </Link>
      </li>
      <li>
        <Link href="/contact#top" className={isActive("/contact#top")}>
          Contact
        </Link>
      </li>

      {isLoggedIn ? (
        <LogoutButton className={styles.logout} />
      ) : (
        <li className={styles.login}>
          <Link href="/login#top" className={isActive("/login#top")}>
            Login
          </Link>
        </li>
      )}
    </ul>
  );
};

export default Links;
