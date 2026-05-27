"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { forwardRef } from "react";

type AdaptiveLinkProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
};

const EXTERNAL_SCHEME_RE = /^[a-zA-Z][a-zA-Z\d+.-]*:/;

function normalizePathname(pathname: string): string {
  if (!pathname || pathname === "/") return "/";
  return pathname.endsWith("/") ? pathname : `${pathname}/`;
}

function resolveHrefForCurrentPage(href: string, pathname: string): string {
  if (href.startsWith("#")) return href;
  if (href.startsWith("//") || EXTERNAL_SCHEME_RE.test(href)) return href;

  try {
    const target = new URL(href, "http://local.test");
    const currentPath = normalizePathname(pathname);
    const targetPath = normalizePathname(target.pathname || "/");

    if (target.hash && !target.search && targetPath === currentPath) {
      return target.hash;
    }
  } catch {
    return href;
  }

  return href;
}

/**
 * Uses native anchors for same-page hash jumps and Next Link for route changes.
 *
 * In this app, same-page fragment navigation does not benefit from the router
 * layer and has been more reliable as plain anchor navigation because we also
 * run custom hash scrolling and URL cleanup logic.
 *
 * Use this mainly for links that may resolve to the current page (for example,
 * `/#hello` while already on `/`). Fixed cross-page links like `/cv/#top` or
 * `/contact/#top` can usually remain plain Next `Link` usage.
 */
const AdaptiveLink = forwardRef<HTMLAnchorElement, AdaptiveLinkProps>(
  ({ href, children, ...anchorProps }, ref) => {
    const pathname = usePathname();
    const resolvedHref = resolveHrefForCurrentPage(href, pathname || "/");
    const shouldUseAnchor =
      resolvedHref.startsWith("#") ||
      resolvedHref.startsWith("//") ||
      EXTERNAL_SCHEME_RE.test(resolvedHref);

    if (shouldUseAnchor) {
      return (
        <a href={resolvedHref} ref={ref} {...anchorProps}>
          {children}
        </a>
      );
    }

    return (
      <Link href={resolvedHref} ref={ref} {...anchorProps}>
        {children}
      </Link>
    );
  },
);

AdaptiveLink.displayName = "AdaptiveLink";

export default AdaptiveLink;
