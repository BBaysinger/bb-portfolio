"use client";

/**
 * Authentication-aware nav item.
 *
 * Responsibilities:
 * - Shows a "Login" link when unauthenticated.
 * - Shows a "Logout" button when authenticated.
 * - Avoids layout shift during auth initialization by rendering an invisible placeholder.
 *
 * Key exports:
 * - Default export `AuthNavItem`.
 */

import clsx from "clsx";
import Link from "next/link";
import React from "react";

import { useAuth } from "@/hooks/useAuth";
import { useAppSelector } from "@/store/hooks";

import styles from "./AuthNavItem.module.scss";

interface Props {
  className?: string;
  /** Optional class to apply to the clickable control (<Link> or <button>) */
  linkClassName?: string;
}

/**
 * Nav item that switches between Login and Logout.
 *
 * The "loading" state uses `visibility: hidden` text (not `display: none`) so the
 * header layout remains stable while auth state is being established client-side.
 *
 * @param props - Component props.
 * @param props.className - Class applied to the wrapping `<li>`.
 * @param props.linkClassName - Class applied to the inner `<Link>`/`<button>`.
 */
export default function AuthNavItem({
  className = "",
  linkClassName = "",
}: Props) {
  const { isLoggedIn, user, hasInitialized } = useAppSelector((s) => s.auth);
  const authed = isLoggedIn || Boolean(user);
  const { logout } = useAuth();

  if (!hasInitialized) {
    // Preserve layout without announcing a misleading control
    return (
      <li className={clsx(className)}>
        <span style={{ visibility: "hidden" }}>Login</span>
      </li>
    );
  }

  if (authed) {
    return (
      <li className={clsx(className, styles.logoutButton, "logoutButton")}>
        <button type="button" onClick={logout} className={clsx(linkClassName)}>
          Logout
        </button>
      </li>
    );
  }

  return (
    <li className={clsx(className)}>
      <Link href="/login#top" className={clsx(linkClassName)}>
        Login
      </Link>
    </li>
  );
}
