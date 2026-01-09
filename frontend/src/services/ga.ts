"use client";

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

function ensureGtagStub() {
  if (typeof window === "undefined") return;

  window.dataLayer = window.dataLayer || [];
  window.gtag =
    window.gtag || ((...args: unknown[]) => window.dataLayer?.push(args));
}

/**
 * Record a GA4 custom event.
 *
 * No-op if NEXT_PUBLIC_GA_MEASUREMENT_ID is unset.
 */
export function recordGAEvent(
  eventName: string,
  params?: Record<string, unknown>,
) {
  if (!GA_MEASUREMENT_ID) return;
  if (typeof window === "undefined") return;

  ensureGtagStub();
  window.gtag?.("event", eventName, params ?? {});
}
