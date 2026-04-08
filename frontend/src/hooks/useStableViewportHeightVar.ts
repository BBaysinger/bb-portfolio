"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";

import { getViewportHeightPx } from "@/utils/viewport";

import { useViewportSettle } from "./viewportSettle";

export type HeightOnlyResizeContext = {
  width: number;
  height: number;
  widthDelta: number | null;
  heightDelta: number | null;
  isFullscreen: boolean;
  hasCoarsePointer: boolean;
  canHover: boolean;
};

export type HeightOnlyResizePolicy =
  | "never"
  | "fullscreen-only"
  | "pointer-fine"
  | ((context: HeightOnlyResizeContext) => boolean);

export interface UseStableViewportHeightOptions {
  widthChangeThresholdPx?: number;
  heightOnlyResizePolicy?: HeightOnlyResizePolicy;
}

export interface UseStableViewportHeightVarOptions extends UseStableViewportHeightOptions {
  cssVarName?: string;
}

function getInteractionCapabilities() {
  let hasCoarsePointer = false;
  let canHover = false;

  try {
    hasCoarsePointer = window.matchMedia("(pointer: coarse)").matches;
    canHover = window.matchMedia("(hover: hover)").matches;
  } catch {
    hasCoarsePointer = false;
    canHover = false;
  }

  return { hasCoarsePointer, canHover };
}

function getIsFullscreen() {
  return typeof document !== "undefined" && Boolean(document.fullscreenElement);
}

/**
 * Returns a stable viewport height in CSS pixels.
 *
 * The hook filters out mobile browser chrome jitter by default, while still
 * allowing consumers to opt into height-only resize handling when appropriate.
 */
export function useStableViewportHeight(
  options: UseStableViewportHeightOptions = {},
) {
  const { widthChangeThresholdPx = 60, heightOnlyResizePolicy = "never" } =
    options;

  const [stableHeightPx, setStableHeightPx] = useState<number | null>(null);
  const lastWidthRef = useRef<number | null>(null);
  const lastHeightRef = useRef<number | null>(null);
  const resizeSettleTimeoutRef = useRef<number | null>(null);
  const resizeRafRef = useRef<number | null>(null);

  const getWidthDelta = useCallback((width: number) => {
    const lastWidth = lastWidthRef.current;
    if (lastWidth == null) return null;
    return Math.abs(width - lastWidth);
  }, []);

  const applyStableHeightPx = useCallback((height: number) => {
    if (height <= 0) return;

    lastHeightRef.current = height;
    setStableHeightPx((prev) => (prev === height ? prev : height));
  }, []);

  const measureStableHeightPx = useCallback(() => {
    applyStableHeightPx(getViewportHeightPx());
  }, [applyStableHeightPx]);

  const shouldTrustHeightOnlyResize = useCallback(
    (
      context: Omit<HeightOnlyResizeContext, "hasCoarsePointer" | "canHover">,
    ) => {
      const { hasCoarsePointer, canHover } = getInteractionCapabilities();
      const fullContext: HeightOnlyResizeContext = {
        ...context,
        hasCoarsePointer,
        canHover,
      };

      if (typeof heightOnlyResizePolicy === "function") {
        return heightOnlyResizePolicy(fullContext);
      }

      switch (heightOnlyResizePolicy) {
        case "fullscreen-only":
          return fullContext.isFullscreen;
        case "pointer-fine":
          return !fullContext.hasCoarsePointer && fullContext.canHover;
        case "never":
        default:
          return false;
      }
    },
    [heightOnlyResizePolicy],
  );

  const scheduleTrailingMeasure = useCallback(() => {
    if (resizeSettleTimeoutRef.current !== null) {
      window.clearTimeout(resizeSettleTimeoutRef.current);
    }

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
    (
      eventType:
        | "resize"
        | "orientationchange"
        | "fullscreenchange"
        | "visibilitychange",
    ) => {
      if (eventType === "orientationchange") {
        if (resizeSettleTimeoutRef.current !== null) {
          window.clearTimeout(resizeSettleTimeoutRef.current);
          resizeSettleTimeoutRef.current = null;
        }
        measureStableHeightPx();
        return;
      }

      if (
        eventType === "fullscreenchange" ||
        eventType === "visibilitychange"
      ) {
        scheduleTrailingMeasure();
        return;
      }

      const width = window.innerWidth;
      const widthDelta = getWidthDelta(width);
      const height = getViewportHeightPx();
      const lastHeight = lastHeightRef.current;
      const heightDelta =
        lastHeight == null ? null : Math.abs(height - lastHeight);
      const isFullscreen = getIsFullscreen();

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

      if (
        heightDelta !== null &&
        heightDelta > 0 &&
        shouldTrustHeightOnlyResize({
          width,
          height,
          widthDelta,
          heightDelta,
          isFullscreen,
        })
      ) {
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
      shouldTrustHeightOnlyResize,
      widthChangeThresholdPx,
    ],
  );

  useEffect(() => {
    const onResize = () => onWindowEvent("resize");
    const onOrientationChange = () => onWindowEvent("orientationchange");
    const onFullscreenChange = () => onWindowEvent("fullscreenchange");
    const onVisibilityChange = () => onWindowEvent("visibilitychange");

    window.addEventListener("resize", onResize, { passive: true });
    window.addEventListener("orientationchange", onOrientationChange, {
      passive: true,
    });
    document.addEventListener("fullscreenchange", onFullscreenChange);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onOrientationChange);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [onWindowEvent]);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    const onVisualViewportChange = () => {
      const width = Math.round(viewport.width || window.innerWidth || 0);
      const height = Math.round(viewport.height || getViewportHeightPx() || 0);
      const widthDelta = getWidthDelta(width);
      const lastHeight = lastHeightRef.current;
      const heightDelta =
        lastHeight == null ? null : Math.abs(height - lastHeight);
      const isFullscreen = getIsFullscreen();

      if (
        (widthDelta !== null && widthDelta > 0) ||
        (heightDelta !== null &&
          heightDelta > 0 &&
          shouldTrustHeightOnlyResize({
            width,
            height,
            widthDelta,
            heightDelta,
            isFullscreen,
          }))
      ) {
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
  }, [getWidthDelta, scheduleTrailingMeasure, shouldTrustHeightOnlyResize]);

  useEffect(() => {
    lastWidthRef.current = window.innerWidth;
    lastHeightRef.current = getViewportHeightPx();

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

  return stableHeightPx;
}

/**
 * Convenience wrapper that writes the measured stable viewport height to a CSS
 * custom property on a target element.
 */
export default function useStableViewportHeightVar(
  elementRef: RefObject<HTMLElement | null>,
  options: UseStableViewportHeightVarOptions = {},
) {
  const { cssVarName = "--hero-stable-vh", ...measurementOptions } = options;
  const stableHeightPx = useStableViewportHeight(measurementOptions);

  useEffect(() => {
    const el = elementRef.current;
    if (!el || stableHeightPx === null) return;

    el.style.setProperty(cssVarName, `${stableHeightPx}px`);
  }, [cssVarName, elementRef, stableHeightPx]);
}
