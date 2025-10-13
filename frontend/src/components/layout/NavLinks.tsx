"use client";

import Link from "next/link";
import React from "react";

import LogoutButton from "@/components/common/LogoutButton";
import { useAuth } from "@/hooks/useAuth";
import { useNavHighlight } from "@/hooks/useNavHighlight";

import styles from "./NavLinks.module.scss";

interface LinksProps {
  onClick?: () => void;
  className?: string;
}

/**
 * Navigation link list populated around the site, like nav variants and footer.
 *
 * @author Bradley Baysinger
 * @since 2025
 * @version N/A
 */
const Links: React.FC<LinksProps> = ({ onClick, className }) => {
  const { isLoggedIn } = useAuth();
  const active = useNavHighlight();

  const linkClass = (target: string) =>
    `${styles.link} ${active === target ? styles.active : ""}`;

  return (
    <ul onClick={onClick} className={`${styles.navLinks} ${className ?? ""}`}>
      <li>
        <Link href="/#hero" className={linkClass("hero")}>
          Home
        </Link>
      </li>
      <li>
        <Link href="/#hello" className={linkClass("hello")}>
          Hello
        </Link>
      </li>
      <li>
        <Link href="/#projects-list" className={linkClass("projects-list")}>
          Projects
        </Link>
      </li>
      <li>
        <Link href="/cv#top" className={linkClass("cv")}>
          CV
        </Link>
      </li>
      <li>
        <Link href="/contact#top" className={linkClass("contact")}>
          Contact
        </Link>
      </li>

      {isLoggedIn ? (
        <LogoutButton className={styles.logout} />
      ) : (
        <li className={styles.login}>
          <Link href="/login#top" className={linkClass("login")}>
            Login
          </Link>
        </li>
      )}
    </ul>
  );
};

export default Links;
