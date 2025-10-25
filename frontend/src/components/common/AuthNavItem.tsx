"use client";

import Link from "next/link";
import React from "react";

import { useAuth } from "@/hooks/useAuth";
import { useAppSelector } from "@/store/hooks";

interface Props {
  className?: string;
}

/**
 * Auth-aware nav item that renders Login (Link) when logged out,
 * and Logout (Button) when logged in. Hides until auth is initialized
 * to avoid flicker.
 */
export default function AuthNavItem({ className = "" }: Props) {
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
      <li className={`${className} logout`}>
        <button type="button" onClick={logout} className="linkLikeButton">
          Logout
        </button>
      </li>
    );
  }

  return (
    <li className={className}>
      <Link href="/login#top">Login</Link>
    </li>
  );
}
