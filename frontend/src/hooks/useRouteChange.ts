// src/hooks/useRouteChange.ts
"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

/**
 * A client-only React hook that invokes a callback whenever the route changes,
 * including changes to the pathname or query string.
 *
 * This hook handles both:
 * - Manual `window.history.pushState()` calls (detected via Next.js hooks)
 * - Browser back/forward button navigation (detected via `popstate` events)
 *
 * This is an attempt to prevent full page reloads when users navigate via browser history buttons
 * and to keep the carousel in sync with the URL. TODO: It doesn't appear to solve this issue.
 * Coming back to this later.
 *
 * This hook must be used inside a Client Component. It will cause a compile-time
 * error if imported in a Server Component due to the `'use client'` directive.
 *
 * @example
 * ```tsx
 * useRouteChange((pathname, search) => {
 *   console.info("Route changed to:", pathname, search);
 * });
 * ```
 *
 * @param callback - A function called with the current pathname and search string
 *                   whenever either one changes.
 */
export function useRouteChange(
  callback: (pathname: string, search: string) => void,
): void {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Handle Next.js route changes (pushState, replaceState)
  useEffect(() => {
    console.info(
      "Route change detected (Next.js):",
      pathname,
      searchParams.toString(),
    );
    callback(pathname, searchParams.toString());
  }, [pathname, searchParams, callback]);

  // Also listen for history API driven changes outside Next's router
  // - popstate: back/forward navigation
  // - bb:routechange: custom event we dispatch after manual pushState/replaceState
  useEffect(() => {
    const handler = () => {
      try {
        const { pathname, search } = window.location;
        console.info("External route change detected:", pathname, search);
        callback(pathname, search);
      } catch {
        // ignore if not in browser
      }
    };
    window.addEventListener("popstate", handler);
    window.addEventListener("bb:routechange", handler as EventListener);
    return () => {
      window.removeEventListener("popstate", handler);
      window.removeEventListener("bb:routechange", handler as EventListener);
    };
    // callback is intentionally included to keep latest reference
  }, [callback]);
}
