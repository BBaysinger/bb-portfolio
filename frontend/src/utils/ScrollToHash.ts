"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";

import { replaceWithReplaceState } from "@/utils/navigation";

const HASH_SCROLL_RETRY_DELAYS_MS = [0, 80, 200] as const;
const HASH_CLEANUP_DELAY_MS = 900;
const HASH_SCROLL_RUN_TTL_MS = Math.max(...HASH_SCROLL_RETRY_DELAYS_MS) + 120;

type ActiveHashScrollRun = {
  signature: string | null;
  didStartScroll: boolean;
  releaseTimeoutId: number | null;
};

function getElementScrollMarginTop(element: HTMLElement): number {
  try {
    const scrollMarginTop = window.getComputedStyle(element).scrollMarginTop;
    const parsed = Number.parseFloat(scrollMarginTop);
    return Number.isFinite(parsed) ? parsed : 0;
  } catch {
    return 0;
  }
}

function resolveHashTarget(hash: string): HTMLElement | null {
  const raw = hash.replace(/^#/, "");
  if (!raw || raw.includes("=")) return null;

  const byId = document.getElementById(raw);
  if (byId instanceof HTMLElement) return byId;

  try {
    const cssGlobal: { escape?: (value: string) => string } =
      (
        globalThis as unknown as {
          CSS?: { escape?: (value: string) => string };
        }
      )?.CSS || {};
    const selector = cssGlobal.escape ? `#${cssGlobal.escape(raw)}` : `#${raw}`;
    const queried = document.querySelector(selector);
    return queried instanceof HTMLElement ? queried : null;
  } catch {
    return null;
  }
}

/**
 * Component: ScrollToHash
 *
 * Smoothly scrolls to an element matching the current hash in the URL.
 * Works around browser inconsistencies and resets the hash to allow repeated clicks.
 *
 */
const ScrollToHash = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const cleanupTimeoutRef = useRef<number | null>(null);
  const scrollAttemptTimeoutsRef = useRef<number[]>([]);
  const activeRunRef = useRef<ActiveHashScrollRun>({
    signature: null,
    didStartScroll: false,
    releaseTimeoutId: null,
  });

  const clearScrollAttemptTimers = useCallback(() => {
    scrollAttemptTimeoutsRef.current.forEach((timeoutId) => {
      clearTimeout(timeoutId);
    });
    scrollAttemptTimeoutsRef.current = [];
  }, []);

  const clearActiveRun = useCallback(() => {
    if (activeRunRef.current.releaseTimeoutId !== null) {
      clearTimeout(activeRunRef.current.releaseTimeoutId);
    }

    activeRunRef.current = {
      signature: null,
      didStartScroll: false,
      releaseTimeoutId: null,
    };
  }, []);

  const clearPendingTimers = useCallback(() => {
    if (cleanupTimeoutRef.current !== null) {
      clearTimeout(cleanupTimeoutRef.current);
      cleanupTimeoutRef.current = null;
    }

    clearScrollAttemptTimers();
    clearActiveRun();
  }, [clearActiveRun, clearScrollAttemptTimers]);

  const scheduleHashCleanup = useCallback((hash: string) => {
    if (!hash) return;

    cleanupTimeoutRef.current = window.setTimeout(() => {
      if (window.location.hash !== hash) {
        cleanupTimeoutRef.current = null;
        return;
      }

      replaceWithReplaceState(
        `${window.location.pathname}${window.location.search}`,
      );
      cleanupTimeoutRef.current = null;
    }, HASH_CLEANUP_DELAY_MS);
  }, []);

  const handleHashNavigation = useCallback(() => {
    if (typeof window === "undefined") return;

    const { hash } = window.location;
    if (!hash) {
      clearPendingTimers();
      return;
    }

    const raw = hash.replace(/^#/, "");
    if (!raw || raw.includes("=")) {
      clearPendingTimers();
      return;
    }

    const signature = `${window.location.pathname}${window.location.search}${hash}`;
    if (activeRunRef.current.signature === signature) {
      return;
    }

    clearPendingTimers();

    activeRunRef.current = {
      signature,
      didStartScroll: false,
      releaseTimeoutId: window.setTimeout(() => {
        if (
          activeRunRef.current.signature === signature &&
          !activeRunRef.current.didStartScroll
        ) {
          clearActiveRun();
        }
      }, HASH_SCROLL_RUN_TTL_MS),
    };

    HASH_SCROLL_RETRY_DELAYS_MS.forEach((delayMs) => {
      const timeoutId = window.setTimeout(() => {
        window.requestAnimationFrame(() => {
          if (window.location.hash !== hash) return;
          if (activeRunRef.current.signature !== signature) return;

          const element = resolveHashTarget(hash);
          if (!element) return;
          if (activeRunRef.current.didStartScroll) return;

          activeRunRef.current.didStartScroll = true;
          clearScrollAttemptTimers();

          const scrollMarginTop = getElementScrollMarginTop(element);

          const top = Math.max(
            0,
            Math.round(
              element.getBoundingClientRect().top +
                window.scrollY -
                scrollMarginTop,
            ),
          );

          try {
            window.scrollTo({ top, behavior: "smooth" });
          } catch {
            element.scrollIntoView({ behavior: "smooth", block: "start" });
          }

          scheduleHashCleanup(hash);
        });
      }, delayMs);

      scrollAttemptTimeoutsRef.current.push(timeoutId);
    });
  }, [
    clearActiveRun,
    clearPendingTimers,
    clearScrollAttemptTimers,
    scheduleHashCleanup,
  ]);

  useEffect(() => {
    handleHashNavigation();

    return () => {
      clearPendingTimers();
    };
  }, [clearPendingTimers, handleHashNavigation, pathname, searchParams]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const onLocationChange = () => {
      window.requestAnimationFrame(handleHashNavigation);
    };

    window.addEventListener("hashchange", onLocationChange);
    window.addEventListener(
      "bb:routechange",
      onLocationChange as EventListener,
    );

    return () => {
      window.removeEventListener("hashchange", onLocationChange);
      window.removeEventListener(
        "bb:routechange",
        onLocationChange as EventListener,
      );
    };
  }, [handleHashNavigation]);

  return null;
};

export default ScrollToHash;
