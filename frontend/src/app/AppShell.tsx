"use client";

import clsx from "clsx";
import React, { useRef, useEffect } from "react";
import { useSelector } from "react-redux";

import Footer from "@/components/layout/Footer";
import NavVariant, { NavVariants } from "@/components/layout/NavVariant";
import { useAutoCloseMobileNavOnScroll } from "@/hooks/useAutoCloseMobileNavOnScroll";
import useClientDimensions from "@/hooks/useClientDimensions";
import { useFluidVariables } from "@/hooks/useFluidVariables";
import { useTrackHeroInView } from "@/hooks/useTrackHeroInView";
import { RootState } from "@/store/store";
import ScrollToHash from "@/utils/ScrollToHash";

import styles from "./AppShell.module.scss";

/**
 * Client-side application shell component
 */
export function AppShell({ children }: { children: React.ReactNode }) {
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

  const mainContentRef = useRef<HTMLDivElement>(null);

  useClientDimensions();
  useTrackHeroInView();
  useAutoCloseMobileNavOnScroll();

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
        ref={mainContentRef}
      >
        <ScrollToHash />
        {children}
        <Footer mutationElemRef={mainContentRef} />
      </div>
    </div>
  );
}
