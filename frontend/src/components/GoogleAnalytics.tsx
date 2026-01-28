"use client";

import Script from "next/script";
import { useCallback } from "react";

import { useRouteChange } from "@/hooks/useRouteChange";

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

function normalizeLandingR(value: string | null): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  // Keep it simple + safe: allow short slugs like "github", "hn", "newsletter-jan".
  // Reject anything that looks like a URL or has weird characters.
  if (!/^[a-z0-9][a-z0-9_-]{0,63}$/i.test(trimmed)) return undefined;

  return trimmed;
}

function sendPageView(pagePath: string) {
  if (!GA_MEASUREMENT_ID) return;
  if (typeof window === "undefined") return;

  // Ensure events can be queued before gtag.js finishes loading.
  window.dataLayer = window.dataLayer || [];
  window.gtag =
    window.gtag || ((...args: unknown[]) => window.dataLayer?.push(args));

  // In GA4, when initial config sets send_page_view:false, you must emit
  // explicit page_view events for SPA/app-router navigation.
  const landingR = normalizeLandingR(
    new URL(window.location.href).searchParams.get("r"),
  );
  if (landingR) {
    // Useful for analysis across events; also register `landing_r` as a custom
    // dimension (event parameter) in GA4 if you want it in reports.
    window.gtag("set", "user_properties", { landing_r: landingR });
  }

  window.gtag("event", "page_view", {
    page_path: pagePath,
    page_location: window.location.href,
    page_title: document.title,
    ...(landingR ? { landing_r: landingR } : {}),
  });
}

/**
 * Minimal Google Analytics 4 integration for Next.js App Router.
 * - Loads gtag.js after hydration
 * - Emits page_view on client-side route changes
 *
 * Enabled only when NEXT_PUBLIC_GA_MEASUREMENT_ID is set.
 */
export function GoogleAnalytics() {
  const handleRouteChange = useCallback((pathname: string, search: string) => {
    if (!GA_MEASUREMENT_ID) return;
    if (!pathname) return;

    const url = search ? `${pathname}?${search}` : pathname;
    sendPageView(url);
  }, []);

  // Important for this app: carousel navigation updates `?p=` via history.pushState
  // (not Next.js router), so we must also listen to external navigation signals
  // like our custom bb:routechange.
  useRouteChange(handleRouteChange, { mode: "both" });

  if (!GA_MEASUREMENT_ID) return null;

  return (
    <>
      <Script
        id="ga4-gtag-src"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-gtag-init" strategy="afterInteractive">
        {`
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
window.gtag = gtag;
gtag('js', new Date());
gtag('config', '${GA_MEASUREMENT_ID}', { send_page_view: false });
        `}
      </Script>
    </>
  );
}
