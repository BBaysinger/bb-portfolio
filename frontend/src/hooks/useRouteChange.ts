// src/hooks/useRouteChange.ts
"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

/**
 * A client-only React hook that invokes a callback whenever the route changes,
 * including changes to the pathname or query string.
 *
 * This hook is essential if you're using `window.history.pushState()` to manually
 * update the URL without triggering a full rerender. Unlike the native `popstate`
 * event, `pushState` does not emit any automatic browser events, so hooks like
 * `usePathname()` and `useSearchParams()` are the recommended way to detect those changes
 * in Next.js App Router.
 *
 * This hook must be used inside a Client Component. It will cause a compile-time
 * error if imported in a Server Component due to the `'use client'` directive.
 *
 * @example
 * ```tsx
 * useRouteChange((pathname, search) => {
 *   console.log("Route changed to:", pathname, search);
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

  useEffect(() => {
    console.log("Route change detected:", pathname, searchParams.toString());
    callback(pathname, searchParams.toString());
  }, [pathname, searchParams, callback]);
}
