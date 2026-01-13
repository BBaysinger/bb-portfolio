"use client";

import Link from "next/link";
import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from "react";

import { navigateWithPushState } from "@/utils/navigation";

/**
 * PushStateLink
 *
 * Renders a Next.js `Link`, but optionally intercepts eligible clicks to perform
 * `history.pushState()` navigation via `navigateWithPushState()`.
 *
 * This supports in-session UI navigation (e.g., carousel prev/next) without
 * triggering a full route transition, while still keeping SSR-friendly markup
 * and Link prefetch behavior.
 */

type PushStateLinkProps = {
  /** Destination URL (typically same-origin, app-internal). */
  href: string;
  /** Content inside the link. */
  children: ReactNode;
  /** Optional callback to run after navigation. */
  onNavigate?: () => void;
  /** Whether to scroll to top after pushState (default: false). */
  scrollToTop?: boolean;
} & Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  "href" | "onClick" | "children"
>;

/**
 * Link component that uses `pushState` for UI-only navigation.
 *
 * Non-obvious behavior:
 * - Always renders a Next.js `Link` to avoid hydration mismatches.
 * - Only intercepts unmodified left-clicks to same-origin URLs.
 * - Allows default browser behavior for external URLs, new-tab clicks, etc.
 */
export function PushStateLink({
  href,
  children,
  onNavigate,
  scrollToTop = false,
  ...anchorProps
}: PushStateLinkProps) {
  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.defaultPrevented) return;

    // Only intercept standard left-clicks; let the browser handle new tabs, context menus, etc.
    if (e.button !== 0) return;
    if (e.metaKey || e.altKey || e.ctrlKey || e.shiftKey) return;
    if (anchorProps.target === "_blank") return;

    // `pushState` cannot (and should not) emulate cross-origin navigations.
    try {
      const target = new URL(href, window.location.origin);
      if (target.origin !== window.location.origin) return;
    } catch {
      return;
    }

    e.preventDefault();

    navigateWithPushState(href, null, {
      useDoublePushFallback: process.env.NEXT_PUBLIC_DOUBLE_PUSH === "1",
    });

    if (scrollToTop) window.scrollTo({ top: 0, behavior: "smooth" });
    onNavigate?.();
  };

  return (
    <Link href={href} onClick={handleClick} {...anchorProps}>
      {children}
    </Link>
  );
}
