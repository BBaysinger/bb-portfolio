"use client";

import { useCallback, useEffect, useLayoutEffect, useRef } from "react";

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

    const isOverflowingX = () => {
      const clientWidth = el.clientWidth;
      if (clientWidth <= 0) return false;

      // scrollWidth can be fractional in some browsers; allow small tolerance.
      return el.scrollWidth - clientWidth > 1;
    };

    const countLines = () => {
      const currentFontSizePx =
        Number.parseFloat(window.getComputedStyle(el).fontSize) || fontSizePx;
      const lineHeightPx = resolveLineHeightPx(el, currentFontSizePx);
      const heightPx = el.getBoundingClientRect().height;
      return Math.max(1, Math.round(heightPx / lineHeightPx));
    };

    const needsShrink = () => isOverflowingX() || countLines() > maxLines;

    if (!needsShrink()) return;

    for (let i = 0; i < maxIterations; i++) {
      fontSizePx = Math.max(minFontSizePx, fontSizePx - stepPx);
      el.style.fontSize = `${fontSizePx}px`;

      if (!needsShrink() || fontSizePx === minFontSizePx) break;
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

  useEffect(() => {
    if (typeof window === "undefined") return;

    const el = targetRef.current;
    if (!el) return;

    // Re-run after layout settles. On fast reloads, the first auto-fit pass can
    // happen before the element reaches its final width (fonts/CSS/layout).
    let canceled = false;
    let raf1: number | null = null;
    let raf2: number | null = null;
    let timeoutId: number | null = null;

    const safeSchedule = () => {
      if (canceled) return;
      scheduleAutoFit();
    };

    raf1 = window.requestAnimationFrame(safeSchedule);
    raf2 = window.requestAnimationFrame(() => {
      raf2 = window.requestAnimationFrame(safeSchedule);
    });
    timeoutId = window.setTimeout(safeSchedule, 200);

    // Observe element size changes so we re-fit when final widths apply.
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => safeSchedule());
      ro.observe(el);
    }

    // Font loading can change text metrics without a window resize.
    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
    const onFontsDone = () => safeSchedule();
    if (fonts) {
      // `ready` resolves when all currently-loading fonts finish.
      fonts.ready.then(onFontsDone).catch(() => {
        // no-op
      });
      // Some browsers also emit events.
      try {
        fonts.addEventListener?.("loadingdone", onFontsDone);
        fonts.addEventListener?.("loadingerror", onFontsDone);
      } catch {
        // no-op
      }
    }

    // BFCache restores can resurrect stale inline styles.
    window.addEventListener("pageshow", safeSchedule);

    return () => {
      canceled = true;
      window.removeEventListener("pageshow", safeSchedule);
      if (raf1 !== null) window.cancelAnimationFrame(raf1);
      if (raf2 !== null) window.cancelAnimationFrame(raf2);
      if (timeoutId !== null) window.clearTimeout(timeoutId);
      if (ro) ro.disconnect();
      if (fonts) {
        try {
          fonts.removeEventListener?.("loadingdone", onFontsDone);
          fonts.removeEventListener?.("loadingerror", onFontsDone);
        } catch {
          // no-op
        }
      }
    };
  }, [targetRef, scheduleAutoFit]);

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
