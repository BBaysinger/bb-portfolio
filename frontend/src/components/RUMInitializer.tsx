/**
 * RUMInitializer Component
 *
 * Client-side component that initializes AWS CloudWatch Real User Monitoring (RUM)
 * and tracks navigation events in a Next.js App Router application.
 *
 * Responsibilities:
 * - Initialize RUM client on mount (browser only)
 * - Record initial page view
 * - Track client-side route changes via Next.js navigation hooks
 * - Include query parameters in page view URLs
 *
 * Usage:
 * - Must be rendered in a client component or layout
 * - Renders nothing (returns null)
 * - RUM automatically disabled in dev/local if env vars not configured
 *
 * Related Files:
 * - `src/services/rum.ts` - RUM initialization and event recording
 * - `.env.local` - Environment configuration (optional in dev)
 *
 * @example
 * ```tsx
 * // In app/layout.tsx
 * export default function RootLayout({ children }) {
 *   return (
 *     <html>
 *       <body>
 *         <RUMInitializer />
 *         {children}
 *       </body>
 *     </html>
 *   );
 * }
 * ```
 */

"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

import { initializeRUM, recordPageView, setRUMUser } from "@/services/rum";
import { useAppSelector } from "@/store/hooks";

export function RUMInitializer() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, isLoggedIn } = useAppSelector((state) => state.auth);

  // Initialize RUM on mount
  useEffect(() => {
    initializeRUM();
  }, []);

  // Set user ID when logged in
  useEffect(() => {
    if (isLoggedIn && user?.id) {
      setRUMUser(user.id);
    }
  }, [isLoggedIn, user?.id]);

  // Track route changes for client-side navigation
  useEffect(() => {
    if (pathname) {
      const url = searchParams?.toString()
        ? `${pathname}?${searchParams.toString()}`
        : pathname;
      recordPageView(url);
    }
  }, [pathname, searchParams]);

  return null;
}
