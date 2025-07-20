"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useEffect, useState } from "react";

import LogoutButton from "@/components/common/LogoutButton";
import { useAuth } from "@/context/AuthContext";

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

  // Update hash on mount and on hashchange
  useEffect(() => {
    const updateHash = () => setCurrentHash(window.location.hash);
    updateHash();
    window.addEventListener("hashchange", updateHash);
    return () => window.removeEventListener("hashchange", updateHash);
  }, []);

  const fullPath = `${pathname}${currentHash}`;

  // Returns the active class if target matches current route
  const linkClass = (target: string) => {
    console.log(`Checking link: ${target} against fullPath: ${fullPath}`);
    return `${styles.link} ${fullPath === target ? styles.active : ""}`;
  };

  return (
    <ul onClick={onClick} className={`${styles.navLinks} ${className ?? ""}`}>
      <li>
        <Link href="/#top" className={linkClass("/#top")}>
          Home
        </Link>
      </li>
      <li>
        <Link href="/#portfolio-list" className={linkClass("/#portfolio-list")}>
          Portfolio
        </Link>
      </li>
      <li>
        <Link href="/cv#top" className={linkClass("/cv#top")}>
          CV
        </Link>
      </li>
      <li>
        <Link href="/contact#top" className={linkClass("/contact#top")}>
          Contact
        </Link>
      </li>

      {isLoggedIn ? (
        <LogoutButton className={styles.logout} />
      ) : (
        <li className={styles.login}>
          <Link href="/login#top" className={linkClass("/login#top")}>
            Login
          </Link>
        </li>
      )}
    </ul>
  );
};

export default Links;
