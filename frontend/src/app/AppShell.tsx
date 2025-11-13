"use client";

import clsx from "clsx";
import { useRouter, usePathname } from "next/navigation";
import React, { useRef, useEffect } from "react";
import { useSelector } from "react-redux";

import Footer from "@/components/layout/Footer";
import NavVariant, { NavVariants } from "@/components/layout/NavVariant";
import { useAutoCloseMobileNavOnScroll } from "@/hooks/useAutoCloseMobileNavOnScroll";
import useClientDimensions from "@/hooks/useClientDimensions";
import { useFluidVariables } from "@/hooks/useFluidVariables";
import { useTrackHeroInView } from "@/hooks/useTrackHeroInView";
import { resetAuthState, checkAuthStatus } from "@/store/authSlice";
import { useAppDispatch } from "@/store/hooks";
import { RootState } from "@/store/store";
import ScrollToHash from "@/utils/ScrollToHash";

import styles from "./AppShell.module.scss";

/**
 * Client-side application shell component
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  // Runtime backend health check: logs backend connectivity status on startup
  useEffect(() => {
    // Prefer same-origin relative path to leverage Next.js rewrites (/api -> backend)
    // Absolute URLs (e.g., http://bb-portfolio-backend-local:3001) may not resolve in the browser.
    const healthUrl = "/api/health";

    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort("timeout"), 5000);

    fetch(healthUrl, { signal: abort.signal })
      .then((res) => {
        if (res.ok) {
          console.info(
            `✅ [Runtime Health Check] Backend healthy at ${healthUrl} (status: ${res.status})`,
          );
        } else {
          console.warn(
            `⚠️ [Runtime Health Check] Backend responded but not healthy (status: ${res.status}) at ${healthUrl}`,
          );
        }
      })
      .catch((err: unknown) => {
        // Network errors, CORS, DNS, or timeout will land here
        let aborted = false;
        if (typeof err === "object" && err !== null) {
          const name = (err as { name?: string }).name;
          const message = (err as { message?: string }).message;
          const reason = (err as { reason?: string }).reason;
          aborted =
            name === "AbortError" ||
            reason === "timeout" ||
            message === "timeout";
        }
        if (aborted) {
          // Be less noisy for intentional timeouts
          console.warn(
            `⏱️ [Runtime Health Check] Request timed out at ${healthUrl}`,
          );
        } else {
          console.error(
            `❌ [Runtime Health Check] Failed to reach backend at ${healthUrl}:`,
            err,
          );
        }
      })
      .finally(() => clearTimeout(timer));

    // Cleanup for React StrictMode re-runs and component unmount
    return () => {
      clearTimeout(timer);
      if (!abort.signal.aborted) abort.abort("cleanup");
    };
  }, []);
  const isMenuOpen = useSelector(
    (state: RootState) => state.ui.isMobileNavExpanded,
  );
  const percentHeroInView = useSelector(
    (state: RootState) => state.ui.percentHeroInView,
  );

  const childContentRef = useRef<HTMLDivElement>(null);

  useClientDimensions();
  useTrackHeroInView();
  useAutoCloseMobileNavOnScroll();

  // Conventional cross-tab/session sync: when the tab becomes visible or regains focus,
  // check if the user is authenticated server-side; if so, refresh SSR to reveal protected data.
  useEffect(() => {
    let ticking = false;
    const shouldSkipRefreshForCarousel = () => {
      try {
        if (typeof window === "undefined") return false;
        const path = pathname || "";
        const isCarouselPage = /\/(project|nda)\//.test(path);
        if (!isCarouselPage) return false;
        const hasP = new URL(window.location.href).searchParams.has("p");
        // When the project carousel manages the active item via ?p, avoid
        // router.refresh on focus/visibility which can cause Next to rewrite
        // the dynamic segment and fight the carousel's state.
        return hasP;
      } catch {
        return false;
      }
    };
    const checkAndRefresh = async () => {
      try {
        const res = await fetch("/api/users/me", {
          credentials: "include",
          cache: "no-store",
        });
        if (res.ok) {
          // Session exists server-side: refresh SSR (may reveal protected content)
          // but avoid refreshing on project carousel pages where URL is client-managed.
          if (!shouldSkipRefreshForCarousel()) {
            router.refresh();
          }
        } else if (res.status === 401) {
          // Session no longer valid (e.g., logged out in another tab): clear stale client auth
          dispatch(resetAuthState());
        } else if (res.status >= 500) {
          // Optionally re-check later; do nothing now
        }
      } catch {
        // Network error: silent
      }
    };
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      if (ticking) return;
      ticking = true;
      Promise.resolve().then(() => {
        checkAndRefresh().finally(() => (ticking = false));
      });
    };
    window.addEventListener("focus", onVisible);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [router, dispatch]);

  // Periodic soft auth validation (clears stale user if cookie disappears without a tab visibility event)
  useEffect(() => {
    const id = setInterval(() => {
      // Lightweight head request could be used; reuse existing thunk for clarity
      dispatch(checkAuthStatus());
    }, 60_000); // every 60s
    return () => clearInterval(id);
  }, [dispatch]);

  /**
   * Fluid Responsive System - CSS Variables Provider
   *
   * Original concept and implementation by Bradley Baysinger.
   *
   * Generates CSS custom properties for smooth viewport-based scaling:
   * - [320, 680]: Mobile to tablet scaling (--fluid-percent-320-680)
   * - [320, 768]: Mobile to tablet landscape (--fluid-percent-320-768)
   * - [320, 992]: Mobile to small desktop (--fluid-percent-320-992)
   * - [360, 1280]: Mobile+ to desktop (--fluid-percent-360-1280)
   * - [360, 1440]: Mobile+ to large desktop (--fluid-percent-360-1440)
   * - [320, 1600]: Full mobile to XL desktop range (--fluid-percent-320-1600)
   *
   * These variables power remRange and staticRange SCSS mixins throughout the app
   * for JavaScript-driven responsive design without media query jumps.
   */
  const fluidRef = useFluidVariables([
    [320, 680], // Mobile to tablet
    [320, 768], // Mobile to tablet landscape
    [320, 992], // Mobile to small desktop
    [360, 1280], // Mobile+ to desktop
    [360, 1440], // Mobile+ to large desktop
    [320, 1600], // Full mobile to XL desktop
  ]);

  // ---------------------------------------------------------------------------
  // Cross-browser (iOS Safari focused) scroll-to-top normalization on route change
  // ---------------------------------------------------------------------------
  // Context:
  // - Navigating from the long projects list (scrolled to bottom)
  //   to an individual project page leaves user "stuck" at the bottom on Mobile Safari.
  // - Desktop behaves as expected (scroll resets near top).
  // - App makes heavy use of history.pushState and custom route bridging; combined
  //   with containers that use overflow:hidden, Mobile Safari sometimes preserves
  //   the previous scroll offset even after DOM/content shrink.
  // Strategy:
  // - On pathname changes (excluding hash-only changes), perform a resilient series
  //   of scroll reset attempts. Multiple passes account for layout shifts and
  //   delayed painting on iOS.
  // - Skip when a hash is present (hash scrolling handled by ScrollToHash) to avoid
  //   fighting anchor navigation.
  // - Use direct assignments (documentElement/body.scrollTop) plus window.scrollTo;
  //   some Safari versions ignore one or the other transiently during transitions.
  // - Guard against interfering with carousel-originated in-page query updates by
  //   only acting on pathname segment changes (e.g., /project/slug, /nda/slug, /cv, etc.).
  useEffect(() => {
    if (typeof window === "undefined") return;
    // If only hash changed, let ScrollToHash manage it.
    if (window.location.hash) return;

    // Defer if the project carousel just pushed a query-only change.
    // We only care about segment/leaf page transitions.
    const path = pathname || "";
    const shouldForceTop =
      /\/project\//.test(path) ||
      /\/nda\//.test(path) ||
      /\/projects\/?$/.test(path) ||
      /\/cv\/?$/.test(path);
    if (!shouldForceTop) return;

    let cancelled = false;
    const reset = () => {
      if (cancelled) return;
      // Use all three mechanisms for maximum reliability.
      try {
        window.scrollTo(0, 0);
      } catch {}
      try {
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
      } catch {}
    };

    // Immediate + staged attempts – accounts for async layout / fonts.
    reset();
    requestAnimationFrame(reset); // next frame
    setTimeout(reset, 50); // early paint stabilization
    setTimeout(reset, 120); // late paint / image decode
    setTimeout(reset, 250); // Safari occasional second reflow

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return (
    <div
      ref={fluidRef}
      className={clsx(
        styles.appShell,
        percentHeroInView >= 5 && "isHeroInView5Pct",
        percentHeroInView >= 100 && "isHeroInView100Pct",
        isMenuOpen && "isMobileNavExpanded",
        isMenuOpen && styles.isMobileNavExpanded,
      )}
    >
      {/* Runtime backend health check runs on mount and logs to console */}
      <NavVariant variant={NavVariants.SLIDE_OUT} />
      <div id="top" style={{ position: "absolute", top: "0px" }}></div>
      <div className={styles.underlay} />
      <NavVariant variant={NavVariants.TOP_BAR} />
      <div
        className={clsx(styles.main, styles.navRevelator)}
        // ref={mainContentRef}
      >
        <div ref={childContentRef} className={styles.childContent}>
          <ScrollToHash />
          {children}
        </div>
        <Footer mutationElemRef={childContentRef} />
      </div>
    </div>
  );
}
