"use client";

/**
 * Client-side application shell.
 *
 * Responsibilities:
 * - Hosts the global navigation variants and footer.
 * - Establishes responsive CSS variables via `useLerpVars`.
 * - Coordinates a few client-only behaviors that need to run near the root:
 *   - Initial auth state establishment and periodic validation.
 *   - Cross-tab/session sync on focus/visibility.
 *   - iOS Safari scroll-to-top normalization on route changes.
 *   - Optional backend health probe (dev/ops visibility).
 *
 * Key exports:
 * - `AppShell` – wraps page content with app-wide layout and client behaviors.
 */

import clsx from "clsx";
import { useRouter, usePathname } from "next/navigation";
import React, { Suspense, useRef, useEffect, useState } from "react";
import { useSelector } from "react-redux";

import Footer from "@/components/layout/Footer";
import NavVariant from "@/components/layout/NavVariant";
import { NavVariants } from "@/components/layout/NavVariant.constants";
import { useAutoCloseMobileNavOnScroll } from "@/hooks/useAutoCloseMobileNavOnScroll";
import { useLerpVars } from "@/hooks/useLerpVars";
import { useTrackHeroInView } from "@/hooks/useTrackHeroInView";
import useStableViewportHeightVar from "@/hooks/viewport/useStableViewportHeightVar";
import { recordEvent, setRUMSessionAttributes } from "@/services/rum";
import { resetAuthState, checkAuthStatus } from "@/store/authSlice";
import { useAppDispatch } from "@/store/hooks";
import { RootState } from "@/store/store";
import {
  clearPendingPageExitHomeHeroIntroReplay,
  requestHomeHeroIntroReplay,
} from "@/utils/homeHeroIntroReplay";
import {
  getPublicRedirectForNdaUrl,
  isNdaRoutePath,
} from "@/utils/ndaRouteRedirect";
import ScrollToHash from "@/utils/ScrollToHash";

import styles from "./AppShell.module.scss";

type AppShellProps = {
  children: React.ReactNode;
};

function getLifecycleProbePayload(pathname: string | null) {
  if (typeof window === "undefined") return null;

  const navEntry = performance
    .getEntriesByType("navigation")
    .find(
      (entry): entry is PerformanceNavigationTiming =>
        entry instanceof PerformanceNavigationTiming,
    );

  return {
    path: pathname || window.location.pathname,
    visibilityState:
      typeof document === "undefined" ? undefined : document.visibilityState,
    navType: navEntry?.type,
    wasDiscarded:
      typeof document === "undefined"
        ? undefined
        : (document as Document & { wasDiscarded?: boolean }).wasDiscarded,
  };
}

type LifecycleProbePayload = NonNullable<
  ReturnType<typeof getLifecycleProbePayload>
>;

function buildLifecycleSessionAttributes(
  prefix: "bb_resume" | "bb_lastBackground",
  payload: LifecycleProbePayload,
  extra: Record<string, unknown>,
) {
  return Object.fromEntries(
    Object.entries({
      [`${prefix}Path`]: payload.path,
      [`${prefix}VisibilityState`]: payload.visibilityState,
      [`${prefix}NavType`]: payload.navType,
      [`${prefix}WasDiscarded`]: payload.wasDiscarded,
      [`${prefix}At`]: Date.now(),
      ...Object.fromEntries(
        Object.entries(extra).map(([key, value]) => [
          `${prefix}${key.charAt(0).toUpperCase()}${key.slice(1)}`,
          value,
        ]),
      ),
    }).filter(([, value]) => value !== undefined && value !== null),
  );
}

/**
 * App shell wrapper for all routed pages.
 *
 * @param children - Route content rendered within the shell.
 */
export function AppShell({ children }: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const [reduceMotion, setReduceMotion] = useState(false);
  const lifecycleProbeSentRef = useRef(false);

  useEffect(() => {
    if (lifecycleProbeSentRef.current) return;

    lifecycleProbeSentRef.current = true;
    const payload = getLifecycleProbePayload(pathname);
    if (!payload) return;

    const restoreKind = payload.wasDiscarded
      ? "discard-reload"
      : payload.navType === "reload"
        ? "reload"
        : payload.navType === "back_forward"
          ? "history"
          : "navigate";

    setRUMSessionAttributes(
      buildLifecycleSessionAttributes("bb_resume", payload, {
        phase: "mount",
        restoreKind,
      }),
    );

    recordEvent("app_lifecycle_resume_probe", {
      ...payload,
      phase: "mount",
      restoreKind,
    });
  }, [pathname]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const onPageShow = (event: PageTransitionEvent) => {
      const payload = getLifecycleProbePayload(pathname);
      if (!payload) return;

      setRUMSessionAttributes(
        buildLifecycleSessionAttributes("bb_resume", payload, {
          phase: "pageshow",
          persisted: event.persisted,
          restoreKind: event.persisted ? "bfcache" : "pageshow",
        }),
      );

      recordEvent("app_lifecycle_resume_probe", {
        ...payload,
        phase: "pageshow",
        persisted: event.persisted,
        restoreKind: event.persisted ? "bfcache" : "pageshow",
      });
    };

    window.addEventListener("pageshow", onPageShow);
    return () => {
      window.removeEventListener("pageshow", onPageShow);
    };
  }, [pathname]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handlePageExit = (event: PageTransitionEvent) => {
      const payload = getLifecycleProbePayload(pathname);
      if (payload) {
        setRUMSessionAttributes(
          buildLifecycleSessionAttributes("bb_lastBackground", payload, {
            phase: "pagehide",
            persisted: event.persisted,
            restoreKind: event.persisted ? "bfcache" : "pagehide",
          }),
        );
      }

      requestHomeHeroIntroReplay({ dispatchEvent: false, source: "page-exit" });
    };

    // `pagehide` fires for full unloads and BFCache transitions, which is the
    // leave-and-return path that should replay the home hero intro.
    window.addEventListener("pagehide", handlePageExit);

    return () => {
      window.removeEventListener("pagehide", handlePageExit);
    };
  }, [pathname]);

  useEffect(() => {
    if (pathname === "/") return;

    // Internal route changes should not leave behind a pending replay meant
    // only for true leave-and-return flows.
    clearPendingPageExitHomeHeroIntroReplay();
  }, [pathname]);

  // Runtime backend health check: logs backend connectivity status on startup.
  // Intentionally console-only (no UI) to avoid impacting UX.
  useEffect(() => {
    const enableHealthCheck = process.env.NEXT_PUBLIC_HEALTH_CHECK === "1";
    if (!enableHealthCheck) return;

    // Prefer same-origin relative path so this runs in the browser without DNS surprises.
    // The frontend provides an API proxy route for health checks at /api/health.
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

  useStableViewportHeightVar(childContentRef, {
    cssVarName: "--app-shell-stable-vh",
    mode: "use-where-required",
  });

  useTrackHeroInView();
  useAutoCloseMobileNavOnScroll();

  // Kick off an initial auth status check on mount to establish session state early
  useEffect(() => {
    dispatch(checkAuthStatus());
  }, [dispatch]);

  // Conventional cross-tab/session sync: when the tab becomes visible again,
  // check if the user is authenticated server-side; if so, refresh SSR to reveal protected data.
  useEffect(() => {
    let ticking = false;
    const shouldSkipRefreshForCarousel = () => {
      try {
        if (typeof window === "undefined") return false;
        const path = pathname || "";
        const isCarouselPage = /\/(project|nda-included)\//.test(path);
        if (!isCarouselPage) return false;
        // Avoid router.refresh on project carousel pages where the active item
        // is client-managed via pushState path updates.
        return true;
      } catch {
        return false;
      }
    };
    const checkAndRefresh = async () => {
      const lifecyclePayload = getLifecycleProbePayload(pathname);
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
          if (!hasInitialized) {
            if (lifecyclePayload) {
              setRUMSessionAttributes(
                buildLifecycleSessionAttributes("bb_resume", lifecyclePayload, {
                  phase: "visibility-resume",
                  restoreKind: "visible-auth-pending",
                  authStatus: res.status,
                }),
              );
            }
            if (lifecyclePayload) {
              recordEvent("app_lifecycle_resume_probe", {
                ...lifecyclePayload,
                phase: "visibility-resume",
                restoreKind: "visible-auth-pending",
                authStatus: res.status,
              });
            }
            dispatch(checkAuthStatus());
            return;
          }

          if (!clientAuthed) {
            const shouldRefresh = !shouldSkipRefreshForCarousel();
            if (lifecyclePayload) {
              setRUMSessionAttributes(
                buildLifecycleSessionAttributes("bb_resume", lifecyclePayload, {
                  phase: "visibility-resume",
                  restoreKind: shouldRefresh
                    ? "router-refresh"
                    : "visible-no-refresh",
                  authStatus: res.status,
                }),
              );
              recordEvent("app_lifecycle_resume_probe", {
                ...lifecyclePayload,
                phase: "visibility-resume",
                restoreKind: shouldRefresh
                  ? "router-refresh"
                  : "visible-no-refresh",
                authStatus: res.status,
              });
            }
            dispatch(checkAuthStatus());
            // Avoid refreshing on project carousel pages where URL is client-managed.
            if (shouldRefresh) {
              router.refresh();
            }
          } else if (lifecyclePayload) {
            setRUMSessionAttributes(
              buildLifecycleSessionAttributes("bb_resume", lifecyclePayload, {
                phase: "visibility-resume",
                restoreKind: "visible-no-refresh",
                authStatus: res.status,
              }),
            );
            recordEvent("app_lifecycle_resume_probe", {
              ...lifecyclePayload,
              phase: "visibility-resume",
              restoreKind: "visible-no-refresh",
              authStatus: res.status,
            });
          }
        } else if (res.status === 401) {
          if (lifecyclePayload) {
            setRUMSessionAttributes(
              buildLifecycleSessionAttributes("bb_resume", lifecyclePayload, {
                phase: "visibility-resume",
                restoreKind: "visible-logged-out",
                authStatus: res.status,
              }),
            );
            recordEvent("app_lifecycle_resume_probe", {
              ...lifecyclePayload,
              phase: "visibility-resume",
              restoreKind: "visible-logged-out",
              authStatus: res.status,
            });
          }
          // Session no longer valid (e.g., logged out in another tab): clear stale client auth
          dispatch(resetAuthState());
          // If currently on an NDA route, immediately navigate away for privacy.
          try {
            const path = pathname || "";
            if (isNdaRoutePath(path)) {
              const announcer = document.getElementById("privacyAnnouncement");
              if (announcer) {
                announcer.textContent =
                  "Session ended. Redirecting to public view for privacy.";
              }
              router.replace(
                getPublicRedirectForNdaUrl(path, window.location.search),
              );
            }
          } catch {}
        } else if (res.status >= 500) {
          if (lifecyclePayload) {
            setRUMSessionAttributes(
              buildLifecycleSessionAttributes("bb_resume", lifecyclePayload, {
                phase: "visibility-resume",
                restoreKind: "visible-server-error",
                authStatus: res.status,
              }),
            );
            recordEvent("app_lifecycle_resume_probe", {
              ...lifecyclePayload,
              phase: "visibility-resume",
              restoreKind: "visible-server-error",
              authStatus: res.status,
            });
          }
          // Optionally re-check later; do nothing now
        }
      } catch {
        if (lifecyclePayload) {
          setRUMSessionAttributes(
            buildLifecycleSessionAttributes("bb_resume", lifecyclePayload, {
              phase: "visibility-resume",
              restoreKind: "visible-network-error",
            }),
          );
          recordEvent("app_lifecycle_resume_probe", {
            ...lifecyclePayload,
            phase: "visibility-resume",
            restoreKind: "visible-network-error",
          });
        }
        // Network error: silent
      }
    };
    const onVisibilityChange = () => {
      const lifecyclePayload = getLifecycleProbePayload(pathname);

      if (document.visibilityState !== "visible") {
        if (lifecyclePayload) {
          setRUMSessionAttributes(
            buildLifecycleSessionAttributes(
              "bb_lastBackground",
              lifecyclePayload,
              {
                phase: "visibility-hidden",
                restoreKind: "hidden",
              },
            ),
          );
        }
        return;
      }

      if (ticking) return;
      ticking = true;
      Promise.resolve().then(() => {
        checkAndRefresh().finally(() => (ticking = false));
      });
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
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
      const onNdaPage = isNdaRoutePath(path);
      const authed = Boolean(isLoggedIn) || Boolean(user);
      // Avoid redirecting away from NDA pages until we've established auth state;
      // otherwise reloads may send logged-in users back to home briefly.
      if (onNdaPage && hasInitialized && !isLoading && !authed) {
        const announcer = document.getElementById("privacyAnnouncement");
        if (announcer) {
          announcer.textContent =
            "Logged out. Redirecting to public view for privacy.";
        }
        router.replace(
          getPublicRedirectForNdaUrl(path, window.location.search),
        );
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

  // Provides `--lerp-percent-*` CSS vars used by `remRange`/`percent-var()`.
  // Canonical documentation for this system lives in `useLerpVars`.
  const fluidRef = useLerpVars([
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
  //   only acting on pathname segment changes (e.g., /project/slug, /nda-included/slug, /cv, etc.).
  useEffect(() => {
    if (typeof window === "undefined") return;
    // If only hash changed, let ScrollToHash manage it.
    if (window.location.hash) return;

    // Defer if the project carousel just pushed a query-only change.
    // We only care about segment/leaf page transitions.
    const path = pathname || "";
    const shouldForceTop =
      /\/project\//.test(path) ||
      /\/nda-included\//.test(path) ||
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
      <NavVariant variant={NavVariants.SLIDE_OUT} />
      {/* Anchor target for in-page navigation / scroll-to-top behaviors. */}
      <div id="top" style={{ position: "absolute", top: 0 }} />
      <div className={styles.underlay} />
      <NavVariant variant={NavVariants.TOP_BAR} />
      {/*
        SkipLink target. `tabIndex={-1}` allows programmatic focus after clicking
        the skip link, without inserting it into the normal tab order.
      */}
      <div
        id="main-content"
        role="main"
        tabIndex={-1}
        className={clsx(styles.main, styles.navRevelator)}
      >
        <div ref={childContentRef} className={styles.childContent}>
          <Suspense fallback={null}>
            <ScrollToHash />
          </Suspense>
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
