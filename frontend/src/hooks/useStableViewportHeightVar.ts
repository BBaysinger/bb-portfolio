"use client";

import { useEffect } from "react";
import type { RefObject } from "react";

export interface UseStableViewportHeightVarOptions {
  cssVarName?: string;
  widthChangeThresholdPx?: number;
}

/**
 * useStableViewportHeightVar
 *
 * Sets a CSS custom property on a target element to a *stable* pixel viewport height.
 *
 * This is primarily useful on mobile browsers where viewport units (`vh`/`svh`/`dvh`)
 * can jitter as the browser chrome shows/hides during scrolling (notably Firefox Android).
 *
 * Behavior:
 * - Measures once after mount (via rAF)
 * - Updates on orientation change
 * - Updates on resize only when width changes meaningfully (split-screen / orientation),
 *   ignoring small height-only resize noise from scroll-chrome.
 */
export default function useStableViewportHeightVar(
  elementRef: RefObject<HTMLElement | null>,
  options: UseStableViewportHeightVarOptions = {},
) {
  const { cssVarName = "--hero-stable-vh", widthChangeThresholdPx = 60 } =
    options;

  useEffect(() => {
    const el = elementRef.current;
    if (!el) return;

    const measureStableHeightPx = () => {
      const visual = window.visualViewport?.height;
      const height = Math.round((visual ?? window.innerHeight) || 0);
      if (height > 0) {
        el.style.setProperty(cssVarName, `${height}px`);
      }
    };

    const rafId = requestAnimationFrame(measureStableHeightPx);

    let lastWidth = window.innerWidth;
    const onResize = () => {
      const width = window.innerWidth;
      const widthDelta = Math.abs(width - lastWidth);
      if (widthDelta < widthChangeThresholdPx) return;
      lastWidth = width;
      measureStableHeightPx();
    };

    window.addEventListener("resize", onResize, { passive: true });
    window.addEventListener("orientationchange", measureStableHeightPx, {
      passive: true,
    });

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", measureStableHeightPx);
    };
  }, [cssVarName, elementRef, widthChangeThresholdPx]);
}
