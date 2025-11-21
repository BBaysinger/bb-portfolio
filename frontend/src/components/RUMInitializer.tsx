"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

import { initializeRUM, recordPageView } from "@/services/rum";

/**
 * Initializes CloudWatch RUM for visitor tracking
 * Must be a client component to access browser APIs
 * 
 * Tracks both initial page loads and client-side navigation
 * in Next.js using the App Router
 */
export function RUMInitializer() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Initialize RUM on mount
  useEffect(() => {
    initializeRUM();
  }, []);

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
