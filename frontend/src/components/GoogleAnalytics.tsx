"use client";

import { usePathname, useSearchParams } from "next/navigation";
import Script from "next/script";
import { useEffect } from "react";

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
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
  window.gtag("event", "page_view", {
    page_path: pagePath,
    page_location: window.location.href,
    page_title: document.title,
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
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!GA_MEASUREMENT_ID) return;
    if (!pathname) return;

    const url = searchParams?.toString()
      ? `${pathname}?${searchParams.toString()}`
      : pathname;

    sendPageView(url);
  }, [pathname, searchParams]);

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
