"use client";

import Link from "next/link";
import React from "react";

import AuthNavItem from "@/components/common/AuthNavItem";
import { useNavHighlight } from "@/hooks/useNavHighlight";

import styles from "./NavLinks.module.scss";

interface NavLinksProps {
  onClick?: () => void;
  className?: string;
}

/**
 * Navigation link list populated around the site, like nav variants and footer.
 *
 */
const NavLinks: React.FC<NavLinksProps> = ({ onClick, className }) => {
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

      <AuthNavItem className={styles.login} />
    </ul>
  );
};

export default NavLinks;
