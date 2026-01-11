"use client";

import { useCallback, useEffect, useRef } from "react";
import type { RefObject } from "react";

import { useWindowMonitor } from "./useLayoutMonitor";

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

  const lastWidthRef = useRef<number | null>(null);

  const measureStableHeightPx = useCallback(() => {
    const el = elementRef.current;
    if (!el) return;

    const visual = window.visualViewport?.height;
    const height = Math.round((visual ?? window.innerHeight) || 0);
    if (height > 0) {
      el.style.setProperty(cssVarName, `${height}px`);
    }
  }, [cssVarName, elementRef]);

  const onWindowEvent = useCallback(
    (eventType: string) => {
      if (eventType === "orientationchange") {
        measureStableHeightPx();
        return;
      }

      if (eventType !== "resize") return;

      const width = window.innerWidth;
      const lastWidth = lastWidthRef.current;
      if (lastWidth == null) {
        lastWidthRef.current = width;
        measureStableHeightPx();
        return;
      }

      const widthDelta = Math.abs(width - lastWidth);
      if (widthDelta < widthChangeThresholdPx) return;

      lastWidthRef.current = width;
      measureStableHeightPx();
    },
    [measureStableHeightPx, widthChangeThresholdPx],
  );

  useWindowMonitor(elementRef, (eventType) => onWindowEvent(eventType), {
    resize: 0,
    orientationchange: 0,
    fullscreenchange: 0,
    scroll: -1,
    visibilitychange: -1,
  });

  useEffect(() => {
    lastWidthRef.current = window.innerWidth;
    const rafId = requestAnimationFrame(measureStableHeightPx);
    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [measureStableHeightPx]);
}
