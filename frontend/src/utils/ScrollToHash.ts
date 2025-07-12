"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Component: ScrollToHash
 *
 * Smoothly scrolls to an element matching the current hash in the URL.
 * Works around browser inconsistencies and resets the hash to allow repeated clicks.
 *
 * @author Bradley Baysinger
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
      const element = document.querySelector(hash) as HTMLElement | null;

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
            window.history.replaceState(null, "", cleanUrl);
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
