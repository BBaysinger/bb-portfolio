"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { navigateWithPushState } from "@/utils/navigation";

interface PushStateLinkProps {
  /** The destination URL */
  href: string;
  /** Content inside the link */
  children: React.ReactNode;
  /** Optional CSS class for styling */
  className?: string;
  /** Optional callback to run after navigation */
  onNavigate?: () => void;
  /** Whether to scroll to top after pushState (default: false) */
  scrollToTop?: boolean;
}

/**
 * PushStateLink is a hybrid link component that behaves differently
 * on the server vs. the client:
 *
 * - On the server, it renders a Next.js `<Link>` to support static rendering, SEO, and prefetching.
 * - On the client, it renders a plain `<a>` tag and uses `window.history.pushState`
 *   to update the URL without triggering a full page reload or rerender.
 *
 * This is useful for lightweight UI state transitions like carousels, filters, or tab-like views.
 * By default, it preserves the current scroll position — but you can opt into scroll-to-top behavior.
 *
 * @component
 * @example
 * ```tsx
 * <PushStateLink href="/projects?filter=featured" onNavigate={() => setFilter('featured')}>
 *   Featured Projects
 * </PushStateLink>
 *
 * <PushStateLink href="/page-top" scrollToTop>
 *   Back to top
 * </PushStateLink>
 * ```
 *
 */
export function PushStateLink({
  href,
  children,
  className,
  onNavigate,
  scrollToTop = false,
}: PushStateLinkProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();

    navigateWithPushState(href, null, {
      useDoublePushFallback: process.env.NEXT_PUBLIC_DOUBLE_PUSH === "1",
    });

    if (scrollToTop) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    onNavigate?.();
  };

  return (
    <a href={href} onClick={handleClick} className={className}>
      {children}
    </a>
  );
}
