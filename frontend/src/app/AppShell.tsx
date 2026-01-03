"use client";

import clsx from "clsx";
import { useRouter, usePathname } from "next/navigation";
import React, { useRef, useEffect, useState } from "react";
import { useSelector } from "react-redux";

import Footer from "@/components/layout/Footer";
import NavVariant from "@/components/layout/NavVariant";
import { NavVariants } from "@/components/layout/NavVariant.constants";
import { useAutoCloseMobileNavOnScroll } from "@/hooks/useAutoCloseMobileNavOnScroll";
import { useFluidLerpVars } from "@/hooks/useFluidLerpVars";
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
  const [reduceMotion, setReduceMotion] = useState(false);
  // Runtime backend health check: logs backend connectivity status on startup
  useEffect(() => {
    // Prefer same-origin relative path to use Next.js rewrites (/api -> backend)
    // Absolute URLs (e.g., http://bb-portfolio-backend-local:3001) may not resolve in the browser.
    // Allow override for host-run dev (frontend on host, backend on localhost:3001) via NEXT_PUBLIC_HEALTH_URL.
    // Default keeps compose/caddy happy (relative same-origin proxy).
    const healthUrl =
      (process.env.NEXT_PUBLIC_HEALTH_URL || "").trim() || "/api/health/";

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
        const DEBUG_HEALTH = process.env.NEXT_PUBLIC_DEBUG_HEALTH === "1";
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
          if (DEBUG_HEALTH) {
            console.error(
              `❌ [Runtime Health Check] Failed to reach backend at ${healthUrl}:`,
              err,
            );
          } else {
            console.warn(
              `❌ [Runtime Health Check] Failed to reach backend at ${healthUrl} (suppressing details; set NEXT_PUBLIC_DEBUG_HEALTH=1 for stack)`,
            );
          }
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

  const { isLoggedIn, user, hasInitialized, isLoading } = useSelector(
    (state: RootState) => state.auth,
  );

  const childContentRef = useRef<HTMLDivElement>(null);

  useTrackHeroInView();
  useAutoCloseMobileNavOnScroll();

  // Kick off an initial auth status check on mount to establish session state early
  useEffect(() => {
    dispatch(checkAuthStatus());
  }, [dispatch]);

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
        // This probe intentionally checks server truth (cookie-backed session) even if
        // client Redux state says we're logged out. It enables cross-tab sync.
        const res = await fetch("/api/users/me/", {
          credentials: "include",
          cache: "no-store",
        });
        if (res.ok) {
          // Session exists server-side.
          // Only refresh SSR if the client is not yet authenticated/initialized.
          // Otherwise we end up refreshing on every focus event.
          //
          // Why this matters:
          // - router.refresh() can cause the home page to re-run its server fetch.
          // - If that fetch transiently fails and returns an empty snapshot,
          //   the projects list can momentarily render empty (a visible flicker).
          // - When client auth is already consistent, there's no need to refresh.
          const clientAuthed = Boolean(isLoggedIn) || Boolean(user);
          if (!clientAuthed || !hasInitialized) {
            dispatch(checkAuthStatus());
            // Avoid refreshing on project carousel pages where URL is client-managed.
            if (!shouldSkipRefreshForCarousel()) {
              router.refresh();
            }
          }
        } else if (res.status === 401) {
          // Session no longer valid (e.g., logged out in another tab): clear stale client auth
          dispatch(resetAuthState());
          // If currently on an NDA route, immediately navigate away for privacy.
          try {
            const path = pathname || "";
            if (/\/nda\//.test(path)) {
              const announcer = document.getElementById("privacyAnnouncement");
              if (announcer) {
                announcer.textContent =
                  "Session ended. Redirecting to public view for privacy.";
              }
              router.replace("/");
            }
          } catch {}
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
  }, [router, dispatch, pathname, isLoggedIn, user, hasInitialized]);

  // Periodic soft auth validation (clears stale user if cookie disappears)
  // Relaxed for portfolio: only when tab is visible, every 10 minutes.
  useEffect(() => {
    const id = setInterval(() => {
      if (
        typeof document !== "undefined" &&
        document.visibilityState === "visible"
      ) {
        dispatch(checkAuthStatus());
      }
    }, 600_000); // 10 minutes
    return () => clearInterval(id);
  }, [dispatch]);

  // If the user is on an NDA page and becomes unauthenticated, immediately navigate away
  // to reassure privacy (avoid leaving an NDA view open client-side).
  useEffect(() => {
    try {
      const path = pathname || "";
      const onNdaPage = /\/nda\//.test(path);
      const authed = Boolean(isLoggedIn) || Boolean(user);
      // Avoid redirecting away from NDA pages until we've established auth state;
      // otherwise reloads may send logged-in users back to home briefly.
      if (onNdaPage && hasInitialized && !isLoading && !authed) {
        const announcer = document.getElementById("privacyAnnouncement");
        if (announcer) {
          announcer.textContent =
            "Logged out. Redirecting to public view for privacy.";
        }
        router.replace("/");
      }
    } catch {
      // no-op
    }
  }, [pathname, isLoggedIn, user, hasInitialized, isLoading, router]);

  // Detect prefers-reduced-motion and toggle a class that downstream components can observe
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduceMotion(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  // Provides `--fluid-percent-*` CSS vars used by `remRange`/`percent-var()`.
  // Canonical documentation for this system lives in `useFluidLerpVars`.
  const fluidRef = useFluidLerpVars([
    [320, 680], // Mobile to hardcoded carousel max scale width
    [320, 768], // Mobile to tablet landscape
    [320, 992], // Mobile to small desktop
    [360, 1280], // Mobile+ to desktop
    [360, 1440], // Mobile+ to large desktop
    [320, 1600], // Mobile to XL desktop
    [640, 1792], // HeaderSub width lerp (percent values)
    [320, 1792], // Mobile to 16" MacBook Pro
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
        reduceMotion && "reduce-motion",
      )}
    >
      {/* Runtime backend health check runs on mount and logs to console */}
      <NavVariant variant={NavVariants.SLIDE_OUT} />
      <div id="top" style={{ position: "absolute", top: "0px" }}></div>
      <div className={styles.underlay} />
      <NavVariant variant={NavVariants.TOP_BAR} />
      <div id="main-content" className={clsx(styles.main, styles.navRevelator)}>
        <div ref={childContentRef} className={styles.childContent}>
          <ScrollToHash />
          {/* Screen reader-only aria-live region for privacy/logout announcements */}
          <div
            id="privacyAnnouncement"
            aria-live="polite"
            aria-atomic="true"
            style={{
              position: "absolute",
              width: 1,
              height: 1,
              overflow: "hidden",
              clip: "rect(0 0 0 0)",
              clipPath: "inset(50%)",
              whiteSpace: "nowrap",
            }}
          />
          {children}
        </div>
        <Footer mutationElemRef={childContentRef} />
      </div>
    </div>
  );
}
