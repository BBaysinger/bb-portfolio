"use client";

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
 * Authentication-aware navigation item
 * 
 * Dynamically renders either a "Login" link or "Logout" button based on
 * the user's current authentication state. Prevents layout shift by
 * maintaining consistent spacing during auth state initialization.
 * 
 * @component
 * @param {Object} props - Component props
 * @param {string} [props.className=""] - CSS class for the wrapper <li> element
 * @param {string} [props.linkClassName=""] - CSS class for the inner Link/button element
 * 
 * @example
 * ```tsx
 * <AuthNavItem className="nav-item" linkClassName="nav-link" />
 * ```
 * 
 * Features:
 * - Seamless login/logout state transitions
 * - Prevents authentication flicker with hidden placeholder
 * - Accessible button/link semantics
 * - Integration with Redux auth state and useAuth hook
 * - Consistent layout during hydration and auth checks
 * 
 * States:
 * - Loading: Shows invisible "Login" text to preserve layout
 * - Authenticated: Shows logout button with click handler
 * - Unauthenticated: Shows login link to /login#top
 * 
 * @see {@link useAuth} for logout functionality
 * @see {@link useAppSelector} for auth state access
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
      <li className={className}>
        <span style={{ visibility: "hidden" }}>Login</span>
      </li>
    );
  }

  if (authed) {
    return (
      <li className={`${className} ${styles.logoutButton} logoutButton`}>
        <button type="button" onClick={logout} className={linkClassName}>
          Logout
        </button>
      </li>
    );
  }

  return (
    <li className={className}>
      <Link href="/login#top" className={linkClassName}>
        Login
      </Link>
    </li>
  );
}
