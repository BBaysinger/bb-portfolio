"use client";

// Experimental hook for the current Safari hero-height investigation.
// It seeds from a short settle window, then ignores transient mobile scroll chrome changes
// until a real layout transition (width/orientation/fullscreen/pageshow) occurs.
import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";

import { getViewportHeightPx } from "@/utils/viewport";

import {
  getInteractionCapabilities,
  getIsFullscreen,
  getSmallViewportHeightPx,
  isUsableViewportHeight,
} from "./stableViewportHeightUtils";

export interface UseLockedStableViewportHeightVarOptions {
  cssVarName?: string;
  enabled?: boolean;
  widthChangeThresholdPx?: number;
  topScrollGuardPx?: number;
}

const DEFAULT_WIDTH_CHANGE_THRESHOLD_PX = 60;
const DEFAULT_TOP_SCROLL_GUARD_PX = 2;

function getTopAnchoredViewportHeight(topScrollGuardPx: number) {
  const { hasCoarsePointer } = getInteractionCapabilities();
  const atTop = window.scrollY <= topScrollGuardPx;

  if (hasCoarsePointer && atTop) {
    const smallerCandidate = getSmallViewportHeightPx();
    if (isUsableViewportHeight(smallerCandidate)) {
      return smallerCandidate;
    }
  }

  return getViewportHeightPx();
}

export default function useLockedStableViewportHeightVar(
  elementRef: RefObject<HTMLElement | null>,
  options: UseLockedStableViewportHeightVarOptions = {},
) {
  const {
    cssVarName = "--hero-stable-vh",
    enabled = true,
    widthChangeThresholdPx = DEFAULT_WIDTH_CHANGE_THRESHOLD_PX,
    topScrollGuardPx = DEFAULT_TOP_SCROLL_GUARD_PX,
  } = options;

  const [stableHeightPx, setStableHeightPx] = useState<number | null>(null);
  const stableHeightRef = useRef<number | null>(null);
  const lastWidthRef = useRef<number | null>(null);
  const rafIdsRef = useRef<number[]>([]);

  const clearScheduledSamples = useCallback(() => {
    for (const id of rafIdsRef.current) {
      window.cancelAnimationFrame(id);
    }
    rafIdsRef.current = [];
  }, []);

  const commitStableHeight = useCallback(() => {
    const nextHeight = getTopAnchoredViewportHeight(topScrollGuardPx);
    if (!isUsableViewportHeight(nextHeight)) return;

    stableHeightRef.current = nextHeight;
    setStableHeightPx((previousHeight) =>
      previousHeight === nextHeight ? previousHeight : nextHeight,
    );
  }, [topScrollGuardPx]);

  const scheduleLockedMeasurement = useCallback(() => {
    clearScheduledSamples();

    rafIdsRef.current.push(
      window.requestAnimationFrame(() => {
        commitStableHeight();
      }),
    );
  }, [clearScheduledSamples, commitStableHeight]);

  useEffect(() => {
    const el = elementRef.current;
    if (!el) return;

    if (!enabled) {
      stableHeightRef.current = null;
      el.style.removeProperty(cssVarName);
      return;
    }

    const { hasCoarsePointer, canHover } = getInteractionCapabilities();
    const shouldUseMobileSettleLock = hasCoarsePointer || !canHover;

    const reopenSettleWindow = () => {
      lastWidthRef.current = window.innerWidth;
      scheduleLockedMeasurement();
    };

    const onWindowResize = () => {
      const width = window.innerWidth;
      const previousWidth = lastWidthRef.current;
      lastWidthRef.current = width;

      if (!shouldUseMobileSettleLock) {
        commitStableHeight();
        return;
      }

      if (previousWidth === null) {
        reopenSettleWindow();
        return;
      }

      if (Math.abs(width - previousWidth) >= widthChangeThresholdPx) {
        reopenSettleWindow();
      }
    };

    const onOrientationChange = () => {
      if (!shouldUseMobileSettleLock) {
        commitStableHeight();
        return;
      }

      reopenSettleWindow();
    };

    const onFullscreenChange = () => {
      if (!getIsFullscreen() && stableHeightRef.current !== null) {
        lastWidthRef.current = window.innerWidth;
      }

      if (!shouldUseMobileSettleLock) {
        commitStableHeight();
        return;
      }

      reopenSettleWindow();
    };

    const onPageShow = () => {
      if (!shouldUseMobileSettleLock) {
        commitStableHeight();
        return;
      }

      reopenSettleWindow();
    };

    lastWidthRef.current = window.innerWidth;
    scheduleLockedMeasurement();

    window.addEventListener("resize", onWindowResize, { passive: true });
    window.addEventListener("orientationchange", onOrientationChange, {
      passive: true,
    });
    window.addEventListener("pageshow", onPageShow, { passive: true });
    document.addEventListener("fullscreenchange", onFullscreenChange);

    return () => {
      clearScheduledSamples();
      window.removeEventListener("resize", onWindowResize);
      window.removeEventListener("orientationchange", onOrientationChange);
      window.removeEventListener("pageshow", onPageShow);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    };
  }, [
    clearScheduledSamples,
    commitStableHeight,
    cssVarName,
    elementRef,
    enabled,
    scheduleLockedMeasurement,
    widthChangeThresholdPx,
  ]);

  useEffect(() => {
    const el = elementRef.current;
    if (!el) return;

    if (!enabled || stableHeightPx === null) {
      el.style.removeProperty(cssVarName);
      return;
    }

    el.style.setProperty(cssVarName, `${stableHeightPx}px`);
  }, [cssVarName, elementRef, enabled, stableHeightPx]);

  return enabled ? stableHeightPx : null;
}
