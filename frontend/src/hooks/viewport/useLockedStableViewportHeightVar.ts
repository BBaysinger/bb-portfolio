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
  settleMs?: number;
  trailingSampleMs?: number[];
  widthChangeThresholdPx?: number;
  topScrollGuardPx?: number;
}

const DEFAULT_SETTLE_MS = 2500;
const DEFAULT_TRAILING_SAMPLE_MS = [150, 1000, 2500] as const;
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
    settleMs = DEFAULT_SETTLE_MS,
    trailingSampleMs = [...DEFAULT_TRAILING_SAMPLE_MS],
    widthChangeThresholdPx = DEFAULT_WIDTH_CHANGE_THRESHOLD_PX,
    topScrollGuardPx = DEFAULT_TOP_SCROLL_GUARD_PX,
  } = options;

  const [stableHeightPx, setStableHeightPx] = useState<number | null>(null);
  const stableHeightRef = useRef<number | null>(null);
  const lastWidthRef = useRef<number | null>(null);
  const settleActiveUntilRef = useRef<number>(0);
  const timeoutIdsRef = useRef<number[]>([]);
  const rafIdsRef = useRef<number[]>([]);

  const clearScheduledSamples = useCallback(() => {
    for (const id of timeoutIdsRef.current) {
      window.clearTimeout(id);
    }
    for (const id of rafIdsRef.current) {
      window.cancelAnimationFrame(id);
    }
    timeoutIdsRef.current = [];
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

  const scheduleSettleWindow = useCallback(() => {
    clearScheduledSamples();
    settleActiveUntilRef.current = Date.now() + settleMs;

    rafIdsRef.current.push(
      window.requestAnimationFrame(() => {
        commitStableHeight();
      }),
    );

    for (const delayMs of trailingSampleMs) {
      timeoutIdsRef.current.push(
        window.setTimeout(() => {
          commitStableHeight();
        }, delayMs),
      );
    }
  }, [clearScheduledSamples, commitStableHeight, settleMs, trailingSampleMs]);

  useEffect(() => {
    const el = elementRef.current;
    if (!el) return;

    if (!enabled) {
      stableHeightRef.current = null;
      el.style.removeProperty(cssVarName);
      return;
    }

    const isWithinSettleWindow = () =>
      settleActiveUntilRef.current > Date.now();
    const { hasCoarsePointer, canHover } = getInteractionCapabilities();
    const shouldUseMobileSettleLock = hasCoarsePointer || !canHover;

    const commitIfSettling = () => {
      if (!isWithinSettleWindow()) return;
      commitStableHeight();
    };

    const reopenSettleWindow = () => {
      lastWidthRef.current = window.innerWidth;
      scheduleSettleWindow();
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
    if (shouldUseMobileSettleLock) {
      scheduleSettleWindow();
    } else {
      rafIdsRef.current.push(
        window.requestAnimationFrame(() => {
          commitStableHeight();
        }),
      );
    }

    window.addEventListener("resize", onWindowResize, { passive: true });
    window.addEventListener("orientationchange", onOrientationChange, {
      passive: true,
    });
    window.addEventListener("pageshow", onPageShow, { passive: true });
    document.addEventListener("fullscreenchange", onFullscreenChange);

    const viewport = window.visualViewport;
    viewport?.addEventListener("resize", commitIfSettling, { passive: true });
    if (shouldUseMobileSettleLock) {
      viewport?.addEventListener("scroll", commitIfSettling, {
        passive: true,
      });
    }

    return () => {
      clearScheduledSamples();
      settleActiveUntilRef.current = 0;
      window.removeEventListener("resize", onWindowResize);
      window.removeEventListener("orientationchange", onOrientationChange);
      window.removeEventListener("pageshow", onPageShow);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      viewport?.removeEventListener("resize", commitIfSettling);
      if (shouldUseMobileSettleLock) {
        viewport?.removeEventListener("scroll", commitIfSettling);
      }
    };
  }, [
    clearScheduledSamples,
    commitStableHeight,
    cssVarName,
    elementRef,
    enabled,
    scheduleSettleWindow,
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
