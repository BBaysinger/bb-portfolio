"use client";

import { useCallback, useLayoutEffect, useRef } from "react";

import { useWindowMonitor } from "@/hooks/useLayoutMonitor";

type AutoFitTextOptions = {
  /** Element whose font-size will be adjusted. */
  targetRef: React.RefObject<HTMLElement | null>;
  /** Element used as an anchor for subscribing to window events (lifecycle only). */
  anchorRef: React.RefObject<Element | null>;
  /**
   * Rerun auto-fit when this value changes (e.g. the displayed text).
   * Prefer this over a dependency list so hooks linting can be statically verified.
   */
  watch?: unknown;
  /**
   * Optional additional watched values.
   * This is treated as a single dependency by reference; memoize it if needed.
   */
  watchList?: readonly unknown[];

  /** Maximum number of text lines allowed before shrinking. */
  maxLines?: number;
  /** Smallest font-size the auto-fit is allowed to reach. */
  minFontSizePx?: number;
  /** Font-size decrement per iteration. */
  stepPx?: number;
  /** Upper bound to prevent pathological loops. */
  maxIterations?: number;
};

function resolveLineHeightPx(el: HTMLElement, fontSizePx: number): number {
  const lineHeightRaw = window.getComputedStyle(el).lineHeight;
  const lineHeightValue = Number.parseFloat(lineHeightRaw);

  if (Number.isFinite(lineHeightValue) && lineHeightValue > 0) {
    return lineHeightValue;
  }

  // Fallback when line-height is "normal".
  return fontSizePx * 1.2;
}

export function useAutoFitText({
  targetRef,
  anchorRef,
  watch,
  watchList,
  maxLines = 2,
  minFontSizePx = 18,
  stepPx = 1,
  maxIterations = 80,
}: AutoFitTextOptions) {
  const fitRafId = useRef<number | null>(null);

  const runAutoFit = useCallback(() => {
    if (typeof window === "undefined") return;

    const el = targetRef.current;
    if (!el) return;

    // Reset to stylesheet-defined font-size first.
    el.style.fontSize = "";
    void el.offsetHeight;

    const computed = window.getComputedStyle(el);
    let fontSizePx = Number.parseFloat(computed.fontSize) || 16;

    const countLines = () => {
      const currentFontSizePx =
        Number.parseFloat(window.getComputedStyle(el).fontSize) || fontSizePx;
      const lineHeightPx = resolveLineHeightPx(el, currentFontSizePx);
      const heightPx = el.getBoundingClientRect().height;
      return Math.max(1, Math.round(heightPx / lineHeightPx));
    };

    if (countLines() <= maxLines) return;

    for (let i = 0; i < maxIterations; i++) {
      fontSizePx = Math.max(minFontSizePx, fontSizePx - stepPx);
      el.style.fontSize = `${fontSizePx}px`;

      if (countLines() <= maxLines || fontSizePx === minFontSizePx) break;
    }
  }, [targetRef, maxLines, minFontSizePx, stepPx, maxIterations]);

  const scheduleAutoFit = useCallback(() => {
    if (typeof window === "undefined") return;

    if (fitRafId.current !== null) {
      window.cancelAnimationFrame(fitRafId.current);
    }

    fitRafId.current = window.requestAnimationFrame(() => {
      fitRafId.current = null;
      runAutoFit();
    });
  }, [runAutoFit]);

  useLayoutEffect(() => {
    // Run synchronously before paint (when possible) to avoid CSS-size flash.
    runAutoFit();

    return () => {
      if (fitRafId.current !== null) {
        window.cancelAnimationFrame(fitRafId.current);
      }
      fitRafId.current = null;
    };
  }, [runAutoFit, watch, watchList]);

  useWindowMonitor(anchorRef, (eventType) => {
    if (eventType !== "resize") return;
    scheduleAutoFit();
  });

  return {
    runAutoFit,
    scheduleAutoFit,
  };
}

export default useAutoFitText;
