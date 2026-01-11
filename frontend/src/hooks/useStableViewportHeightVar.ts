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
 * can cause the whole layout to shift when reversing scroll direction, if an element in
 * the flow is sized based on these (notably Firefox mobile).
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

    // iOS WebKit (including Chrome iOS) can report an overly-tall viewport on
    // the first frame, then settle shortly after initial paint as browser UI
    // chrome/safe-area stabilizes.
    let rafId1 = 0;
    let rafId2 = 0;

    rafId1 = requestAnimationFrame(() => {
      measureStableHeightPx();
      rafId2 = requestAnimationFrame(measureStableHeightPx);
    });

    const settleTimeoutId = window.setTimeout(measureStableHeightPx, 150);

    const onPageShow = () => measureStableHeightPx();
    window.addEventListener("pageshow", onPageShow);

    const visualViewport = window.visualViewport;
    let visualViewportActive = true;
    const disableVisualViewportId = window.setTimeout(() => {
      visualViewportActive = false;
    }, 1000);

    const onVisualViewportChange = () => {
      if (!visualViewportActive) return;
      measureStableHeightPx();
    };

    visualViewport?.addEventListener("resize", onVisualViewportChange, {
      passive: true,
    });
    visualViewport?.addEventListener("scroll", onVisualViewportChange, {
      passive: true,
    });

    return () => {
      cancelAnimationFrame(rafId1);
      cancelAnimationFrame(rafId2);
      window.clearTimeout(settleTimeoutId);
      window.clearTimeout(disableVisualViewportId);
      window.removeEventListener("pageshow", onPageShow);
      visualViewport?.removeEventListener("resize", onVisualViewportChange);
      visualViewport?.removeEventListener("scroll", onVisualViewportChange);
    };
  }, [measureStableHeightPx]);
}
