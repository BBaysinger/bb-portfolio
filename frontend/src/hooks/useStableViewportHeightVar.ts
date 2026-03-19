"use client";

import { useCallback, useEffect, useRef } from "react";
import type { RefObject } from "react";

import { getViewportHeightPx } from "@/utils/viewport";

import { useWindowMonitor } from "./useLayoutMonitor";
import { useViewportSettle } from "./viewportSettle";

const WINDOW_MONITOR_DEBOUNCE = {
  resize: 0,
  orientationchange: 0,
  fullscreenchange: -1,
  scroll: -1,
  visibilitychange: -1,
} as const;

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
  const resizeSettleTimeoutRef = useRef<number | null>(null);
  const resizeRafRef = useRef<number | null>(null);

  const getWidthDelta = useCallback((width: number) => {
    const lastWidth = lastWidthRef.current;
    if (lastWidth == null) return null;
    return Math.abs(width - lastWidth);
  }, []);

  const measureStableHeightPx = useCallback(() => {
    const el = elementRef.current;
    if (!el) return;

    const height = getViewportHeightPx();
    if (height > 0) {
      el.style.setProperty(cssVarName, `${height}px`);
    }
  }, [cssVarName, elementRef]);

  const scheduleTrailingMeasure = useCallback(() => {
    if (resizeSettleTimeoutRef.current !== null) {
      window.clearTimeout(resizeSettleTimeoutRef.current);
    }

    // Always run one trailing measurement after viewport activity settles,
    // including small width changes that stay below the immediate threshold.
    resizeSettleTimeoutRef.current = window.setTimeout(() => {
      resizeSettleTimeoutRef.current = null;
      if (resizeRafRef.current !== null) {
        window.cancelAnimationFrame(resizeRafRef.current);
      }
      resizeRafRef.current = window.requestAnimationFrame(() => {
        resizeRafRef.current = null;
        lastWidthRef.current = window.innerWidth;
        measureStableHeightPx();
      });
    }, 120);
  }, [measureStableHeightPx]);

  const onWindowEvent = useCallback(
    (eventType: string) => {
      if (eventType === "orientationchange") {
        if (resizeSettleTimeoutRef.current !== null) {
          window.clearTimeout(resizeSettleTimeoutRef.current);
          resizeSettleTimeoutRef.current = null;
        }
        measureStableHeightPx();
        return;
      }

      if (eventType !== "resize") return;

      const width = window.innerWidth;
      const widthDelta = getWidthDelta(width);
      if (widthDelta == null) {
        lastWidthRef.current = width;
        measureStableHeightPx();
        return;
      }

      if (widthDelta >= widthChangeThresholdPx) {
        lastWidthRef.current = width;
        measureStableHeightPx();
        return;
      }

      if (widthDelta > 0) {
        scheduleTrailingMeasure();
      }
    },
    [
      getWidthDelta,
      measureStableHeightPx,
      scheduleTrailingMeasure,
      widthChangeThresholdPx,
    ],
  );

  useWindowMonitor(elementRef, onWindowEvent, WINDOW_MONITOR_DEBOUNCE);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    const onVisualViewportChange = () => {
      const width = Math.round(viewport.width || window.innerWidth || 0);
      const widthDelta = getWidthDelta(width);
      if (widthDelta && widthDelta > 0) {
        scheduleTrailingMeasure();
      }
    };

    viewport.addEventListener("resize", onVisualViewportChange, {
      passive: true,
    });
    viewport.addEventListener("scroll", onVisualViewportChange, {
      passive: true,
    });

    return () => {
      viewport.removeEventListener("resize", onVisualViewportChange);
      viewport.removeEventListener("scroll", onVisualViewportChange);
    };
  }, [getWidthDelta, scheduleTrailingMeasure]);

  useEffect(() => {
    lastWidthRef.current = window.innerWidth;

    return () => {
      if (resizeSettleTimeoutRef.current !== null) {
        window.clearTimeout(resizeSettleTimeoutRef.current);
      }
      if (resizeRafRef.current !== null) {
        window.cancelAnimationFrame(resizeRafRef.current);
      }
    };
  }, []);

  const onViewportSettle = useCallback(() => {
    lastWidthRef.current = window.innerWidth;
    measureStableHeightPx();
  }, [measureStableHeightPx]);

  useViewportSettle(onViewportSettle);
}
