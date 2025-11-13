"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import { replaceWithReplaceState } from "@/utils/navigation";

/**
 * Component: ScrollToHash
 *
 * Smoothly scrolls to an element matching the current hash in the URL.
 * Works around browser inconsistencies and resets the hash to allow repeated clicks.
 *
 */
const ScrollToHash = () => {
  const pathname = usePathname();
  const cleanupTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const { hash } = window.location;

    // Clear any pending timeout from a previous hash change
    if (cleanupTimeoutRef.current !== null) {
      clearTimeout(cleanupTimeoutRef.current);
      cleanupTimeoutRef.current = null;
    }

    if (hash) {
      // Ignore hash parameters used for history separation (e.g., #ts=12345)
      const raw = hash.slice(1);
      if (raw.includes("=")) {
        return; // not an element anchor; skip scrolling and do not attempt to strip it
      }

      // Attempt to find an element by ID. Escape if CSS.escape is available.
      let element: HTMLElement | null = null;
      try {
        // Safely access global CSS.escape without using any.
        const cssGlobal: { escape?: (s: string) => string } =
          (
            globalThis as unknown as {
              CSS?: { escape?: (s: string) => string };
            }
          )?.CSS || {};
        const selector = cssGlobal.escape ? `#${cssGlobal.escape(raw)}` : hash;
        const queried = document.querySelector(selector);
        element = queried instanceof HTMLElement ? queried : null;
      } catch {
        element = null; // malformed selector; safely ignore
      }

      if (element) {
        const initialScrollY = window.scrollY;

        // Wait for potential browser-native scroll before doing it ourselves
        setTimeout(() => {
          const currentScrollY = window.scrollY;
          const scrollDelta = Math.abs(currentScrollY - initialScrollY);

          const maxScrollY =
            document.documentElement.scrollHeight - window.innerHeight;
          const isAtOrPastBottom = window.scrollY >= maxScrollY - 1;
          const browserDidNotScroll = scrollDelta < 2;

          if (isAtOrPastBottom || browserDidNotScroll) {
            if (isAtOrPastBottom) {
              window.scrollTo({
                top: document.body.scrollHeight,
                behavior: "auto",
              });
            }

            setTimeout(() => {
              element.scrollIntoView({ behavior: "smooth" });
            }, 100);
          }

          // Schedule the hash cleanup (remove the hash to
          // allow repeated nav clicks, otherwise scrolling to an element
          // the second time won't work.)
          // Doesn't need to happen immediately, but give enough time
          // for all scrolling to complete.
          cleanupTimeoutRef.current = window.setTimeout(() => {
            const cleanUrl = pathname + window.location.search;
            replaceWithReplaceState(cleanUrl);
            cleanupTimeoutRef.current = null;
          }, 1000);
        }, 100);
      }
    }

    // Cleanup when component unmounts or hash changes
    return () => {
      if (cleanupTimeoutRef.current !== null) {
        clearTimeout(cleanupTimeoutRef.current);
        cleanupTimeoutRef.current = null;
      }
    };
  }, [pathname]);

  return null;
};

export default ScrollToHash;
