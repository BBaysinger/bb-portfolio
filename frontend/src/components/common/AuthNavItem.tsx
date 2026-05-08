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
import React, { useState } from "react";

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
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const hasLogoutError = Boolean(logoutError);

  const isLoading = !hasInitialized;

  const loginAriaHidden = isLoading ? true : undefined;

  const handleLogout = async () => {
    setLogoutError(null);

    try {
      await logout();
    } catch (error) {
      setLogoutError(
        error instanceof Error ? error.message : "Failed to log out.",
      );
    }
  };

  return (
    <li
      className={clsx(
        className,
        authed && styles.logoutButton,
        authed && "logoutButton",
      )}
    >
      {authed ? (
        <button
          type="button"
          onClick={() => {
            void handleLogout();
          }}
          className={clsx(
            linkClassName,
            styles.logoutControl,
            hasLogoutError && styles.logoutControlError,
          )}
          aria-label={logoutError ?? "Logout"}
        >
          {hasLogoutError ? "Error" : "Logout"}
        </button>
      ) : (
        <Link
          href="/login#top"
          className={clsx(linkClassName, isLoading && styles.loadingLink)}
          aria-hidden={loginAriaHidden}
        >
          Login
        </Link>
      )}
    </li>
  );
}
