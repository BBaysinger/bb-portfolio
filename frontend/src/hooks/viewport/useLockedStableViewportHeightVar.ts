"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { RefObject } from "react";

import { isChrome } from "@/utils/browser";
import { getViewportHeightPx } from "@/utils/viewport";

import {
  getInteractionCapabilities,
  getIsFullscreen,
  getLargeViewportHeightPx,
  getSmallViewportHeightPx,
  isUsableViewportHeight,
} from "./stableViewportHeightUtils";

export interface UseLockedStableViewportHeightVarOptions {
  /** Alias for the stable short height (default: `--stable-vh`). */
  cssVarName?: string;
  /** Expanded-browser-chrome viewport height (default: `--short-vh`). */
  shortCssVarName?: string;
  /** Collapsed-browser-chrome viewport height (default: `--long-vh`). */
  longCssVarName?: string;
  /** Route-aware fullscreen viewport height (default: `--fullscreen-viewport-height`). */
  fullscreenViewportCssVarName?: string;
  /** Whether measurement and CSS-variable publication are active. */
  enabled?: boolean;
  /** Width delta treated as a new mobile orientation/layout. */
  widthChangeThresholdPx?: number;
  /** Scroll tolerance used to consider the viewport top-anchored. */
  topScrollGuardPx?: number;
  /** Route identity used to apply browser-specific post-navigation sizing. */
  navigationKey?: string | null;
}

const DEFAULT_WIDTH_CHANGE_THRESHOLD_PX = 60;
const DEFAULT_TOP_SCROLL_GUARD_PX = 2;
// Chrome can correct an oversized fresh-entry viewport over a few frames.
const SETTLE_SAMPLE_FRAME_COUNT = 6;
const TOP_ANCHORED_VISUAL_VIEWPORT_OFFSET_GUARD_PX = 2;

interface MobileViewportHeightCache {
  width: number;
  shortHeight: number | null;
  longHeight: number | null;
}

// Module scope intentionally outlives routed component mounts. Mobile browsers cannot be
// freely resized, so the first trustworthy short height remains valid until orientation
// (or another substantial width change) invalidates the profile.
let mobileViewportHeightCache: MobileViewportHeightCache | null = null;

function resetMobileViewportHeightCache() {
  mobileViewportHeightCache = null;
}

function getMobileViewportHeightCache(widthChangeThresholdPx: number) {
  const width = window.innerWidth;
  if (
    mobileViewportHeightCache !== null &&
    Math.abs(width - mobileViewportHeightCache.width) >= widthChangeThresholdPx
  ) {
    resetMobileViewportHeightCache();
  }

  mobileViewportHeightCache ??= {
    width,
    shortHeight: null,
    longHeight: null,
  };

  return mobileViewportHeightCache;
}

function getCachedMobileShortHeight(widthChangeThresholdPx: number) {
  if (typeof window === "undefined") return null;

  const { hasCoarsePointer, canHover } = getInteractionCapabilities();
  if (!hasCoarsePointer && canHover) return null;

  return getMobileViewportHeightCache(widthChangeThresholdPx).shortHeight;
}

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

function getBoundedLongViewportHeight() {
  const measuredHeight = getViewportHeightPx();
  const cssLongHeight = getLargeViewportHeightPx();

  if (!isUsableViewportHeight(cssLongHeight)) return measuredHeight;
  if (!isUsableViewportHeight(measuredHeight)) return cssLongHeight;

  return Math.min(measuredHeight, cssLongHeight);
}

function getChromeRouteFullscreenViewportHeight(
  cache: MobileViewportHeightCache,
) {
  const shortHeight = cache.shortHeight;
  if (!isUsableViewportHeight(shortHeight)) return null;

  const measuredHeight = getViewportHeightPx();
  if (isUsableViewportHeight(measuredHeight)) return measuredHeight;

  return shortHeight;
}

function getChromeRouteFullscreenViewportCssValue(
  cache: MobileViewportHeightCache,
) {
  const measuredHeight = getChromeRouteFullscreenViewportHeight(cache);
  return isUsableViewportHeight(measuredHeight) ? `${measuredHeight}px` : null;
}

/**
 * Publishes stable viewport lengths as CSS variables.
 *
 * With no target ref, variables are written to `document.documentElement` and are therefore
 * globally inherited. On coarse/non-hover devices, the short and long heights are cached
 * across client-side routes. The short height drives `--stable-vh`; mobile Chrome
 * temporarily publishes the desired fullscreen height to `--fullscreen-viewport-height`
 * after navigation because it does not immediately restore expanded browser chrome.
 * The first real scroll switches that route-aware value back to the short lock.
 */
export default function useLockedStableViewportHeightVar(
  elementRef: RefObject<HTMLElement | null> | null = null,
  options: UseLockedStableViewportHeightVarOptions = {},
) {
  const {
    cssVarName = "--stable-vh",
    shortCssVarName = "--short-vh",
    longCssVarName = "--long-vh",
    fullscreenViewportCssVarName = "--fullscreen-viewport-height",
    enabled = true,
    widthChangeThresholdPx = DEFAULT_WIDTH_CHANGE_THRESHOLD_PX,
    topScrollGuardPx = DEFAULT_TOP_SCROLL_GUARD_PX,
    navigationKey,
  } = options;

  const initialCachedHeight = enabled
    ? getCachedMobileShortHeight(widthChangeThresholdPx)
    : null;
  const [stableHeightPx, setStableHeightPx] = useState<number | null>(
    initialCachedHeight,
  );
  const [shortHeightPx, setShortHeightPx] = useState<number | null>(
    initialCachedHeight,
  );
  const [longHeightPx, setLongHeightPx] = useState<number | null>(() => {
    if (typeof window === "undefined") return null;
    const { hasCoarsePointer, canHover } = getInteractionCapabilities();
    if (!hasCoarsePointer && canHover) return null;

    const cache = getMobileViewportHeightCache(widthChangeThresholdPx);
    return cache.longHeight ?? cache.shortHeight;
  });
  const stableHeightRef = useRef<number | null>(initialCachedHeight);
  const fullscreenViewportHeightRef = useRef<number | null>(
    initialCachedHeight,
  );
  const lastWidthRef = useRef<number | null>(null);
  const needsTopAnchoredCorrectionRef = useRef(false);
  const chromeNavigationUsesLongHeightRef = useRef(false);
  const chromeNavigationHasUserScrollRef = useRef(false);
  const previousNavigationKeyRef = useRef<string | null | undefined>(undefined);
  const rafIdsRef = useRef<number[]>([]);

  const clearScheduledSamples = useCallback(() => {
    for (const id of rafIdsRef.current) {
      window.cancelAnimationFrame(id);
    }
    rafIdsRef.current = [];
  }, []);

  const commitStableHeight = useCallback(() => {
    const measuredHeight = getTopAnchoredViewportHeight(topScrollGuardPx);
    if (!isUsableViewportHeight(measuredHeight)) return;

    const { hasCoarsePointer, canHover } = getInteractionCapabilities();
    const shouldUseMobileCache = hasCoarsePointer || !canHover;
    let nextHeight = measuredHeight;

    if (shouldUseMobileCache && !getIsFullscreen()) {
      const cache = getMobileViewportHeightCache(widthChangeThresholdPx);
      const atTop = window.scrollY <= topScrollGuardPx;
      const visualViewportOffsetTop = window.visualViewport?.offsetTop ?? 0;

      if (
        atTop &&
        visualViewportOffsetTop <= TOP_ANCHORED_VISUAL_VIEWPORT_OFFSET_GUARD_PX
      ) {
        // Chrome can report an oversized visual viewport on a fresh visit before its
        // browser chrome settles. Keep the smallest trustworthy top-anchored sample.
        cache.shortHeight = Math.min(
          cache.shortHeight ?? measuredHeight,
          measuredHeight,
        );
        const nativeLongHeight = getLargeViewportHeightPx();
        if (
          isUsableViewportHeight(nativeLongHeight) &&
          nativeLongHeight > cache.shortHeight
        ) {
          cache.longHeight = Math.max(cache.longHeight ?? 0, nativeLongHeight);
        }
      } else if (!atTop) {
        // Browser chrome can collapse over several frames; the largest sample is the long
        // viewport and is safe to refine because it never drives stable layout sizing.
        const longHeight = getBoundedLongViewportHeight();
        cache.longHeight = Math.max(cache.longHeight ?? 0, longHeight);
      }

      nextHeight = cache.shortHeight ?? measuredHeight;
      setShortHeightPx(cache.shortHeight ?? measuredHeight);
      setLongHeightPx(cache.longHeight ?? cache.shortHeight ?? measuredHeight);
    } else {
      setShortHeightPx(measuredHeight);
      setLongHeightPx(measuredHeight);
    }

    needsTopAnchoredCorrectionRef.current =
      shouldUseMobileCache &&
      window.scrollY > topScrollGuardPx &&
      !isUsableViewportHeight(
        getMobileViewportHeightCache(widthChangeThresholdPx).shortHeight,
      );
    stableHeightRef.current = nextHeight;
    setStableHeightPx((previousHeight) =>
      previousHeight === nextHeight ? previousHeight : nextHeight,
    );
  }, [topScrollGuardPx, widthChangeThresholdPx]);

  const scheduleLockedMeasurement = useCallback(() => {
    clearScheduledSamples();

    const sample = (remainingFrames: number) => {
      const rafId = window.requestAnimationFrame(() => {
        commitStableHeight();
        rafIdsRef.current = rafIdsRef.current.filter((id) => id !== rafId);
        if (remainingFrames > 1) sample(remainingFrames - 1);
      });
      rafIdsRef.current.push(rafId);
    };

    sample(SETTLE_SAMPLE_FRAME_COUNT);
  }, [clearScheduledSamples, commitStableHeight]);

  useEffect(() => {
    const el = elementRef?.current ?? document.documentElement;
    if (!el) return;

    if (!enabled) {
      stableHeightRef.current = null;
      el.style.removeProperty(cssVarName);
      el.style.removeProperty(fullscreenViewportCssVarName);
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
        resetMobileViewportHeightCache();
        reopenSettleWindow();
      }
    };

    const onOrientationChange = () => {
      // This is the primary mobile recapture boundary.
      resetMobileViewportHeightCache();
      chromeNavigationUsesLongHeightRef.current = false;
      chromeNavigationHasUserScrollRef.current = false;
      setShortHeightPx(null);
      setLongHeightPx(null);

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

    const viewport = window.visualViewport;

    const onVisualViewportChange = () => {
      if (!shouldUseMobileSettleLock) {
        scheduleLockedMeasurement();
        return;
      }

      if (window.scrollY > topScrollGuardPx && !getIsFullscreen()) {
        const measuredHeight = getBoundedLongViewportHeight();
        if (isUsableViewportHeight(measuredHeight)) {
          const cache = getMobileViewportHeightCache(widthChangeThresholdPx);
          cache.longHeight = Math.max(cache.longHeight ?? 0, measuredHeight);
          setLongHeightPx(cache.longHeight);
        }
      }

      if (
        chromeNavigationUsesLongHeightRef.current &&
        chromeNavigationHasUserScrollRef.current &&
        window.scrollY > topScrollGuardPx
      ) {
        const shortHeight = getMobileViewportHeightCache(
          widthChangeThresholdPx,
        ).shortHeight;
        if (isUsableViewportHeight(shortHeight)) {
          // Chrome keeps collapsed browser chrome after routing. Once the user actually
          // scrolls, return the route-aware value to the same short-height lock used by
          // the other browsers.
          chromeNavigationUsesLongHeightRef.current = false;
          chromeNavigationHasUserScrollRef.current = false;
          fullscreenViewportHeightRef.current = shortHeight;
          const el = elementRef?.current ?? document.documentElement;
          el.style.setProperty(
            fullscreenViewportCssVarName,
            `${shortHeight}px`,
          );
        }
        return;
      }

      const atTop = window.scrollY <= topScrollGuardPx;
      const visualViewportOffsetTop = viewport?.offsetTop ?? 0;
      // A positive offset usually indicates iOS rubber-band/pull-to-refresh displacement;
      // do not record that transient viewport as the short profile.
      if (
        !atTop ||
        visualViewportOffsetTop > TOP_ANCHORED_VISUAL_VIEWPORT_OFFSET_GUARD_PX
      ) {
        return;
      }

      if (!needsTopAnchoredCorrectionRef.current) return;
      scheduleLockedMeasurement();
    };

    const onWindowScroll = () => {
      // Chrome does not consistently pair a document scroll with a
      // VisualViewport scroll event. Both must drive the route-height contraction.
      onVisualViewportChange();
    };

    const onUserScrollStart = () => {
      if (!chromeNavigationUsesLongHeightRef.current) return;
      chromeNavigationHasUserScrollRef.current = true;
      onVisualViewportChange();
    };

    lastWidthRef.current = window.innerWidth;
    scheduleLockedMeasurement();

    window.addEventListener("resize", onWindowResize, { passive: true });
    window.addEventListener("orientationchange", onOrientationChange, {
      passive: true,
    });
    window.addEventListener("pageshow", onPageShow, { passive: true });
    window.addEventListener("scroll", onWindowScroll, { passive: true });
    window.addEventListener("touchmove", onUserScrollStart, { passive: true });
    window.addEventListener("wheel", onUserScrollStart, { passive: true });
    document.addEventListener("fullscreenchange", onFullscreenChange);
    viewport?.addEventListener("resize", onVisualViewportChange, {
      passive: true,
    });
    viewport?.addEventListener("scroll", onVisualViewportChange, {
      passive: true,
    });

    return () => {
      clearScheduledSamples();
      window.removeEventListener("resize", onWindowResize);
      window.removeEventListener("orientationchange", onOrientationChange);
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener("scroll", onWindowScroll);
      window.removeEventListener("touchmove", onUserScrollStart);
      window.removeEventListener("wheel", onUserScrollStart);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      viewport?.removeEventListener("resize", onVisualViewportChange);
      viewport?.removeEventListener("scroll", onVisualViewportChange);
    };
  }, [
    clearScheduledSamples,
    commitStableHeight,
    cssVarName,
    elementRef,
    enabled,
    fullscreenViewportCssVarName,
    longCssVarName,
    scheduleLockedMeasurement,
    shortCssVarName,
    topScrollGuardPx,
    widthChangeThresholdPx,
  ]);

  useLayoutEffect(() => {
    const el = elementRef?.current ?? document.documentElement;
    if (!el) return;

    if (!enabled || stableHeightPx === null) {
      fullscreenViewportHeightRef.current = null;
      el.style.removeProperty(fullscreenViewportCssVarName);
      el.style.removeProperty(cssVarName);
      el.style.removeProperty(shortCssVarName);
      el.style.removeProperty(longCssVarName);
      return;
    }

    // Publish before paint so route mounts consume the cached short height without a frame
    // rendered at Safari's temporary collapsed-chrome height.
    if (!chromeNavigationUsesLongHeightRef.current) {
      fullscreenViewportHeightRef.current = stableHeightPx;
    }
    const fullscreenViewportHeight = fullscreenViewportHeightRef.current;

    el.style.setProperty(cssVarName, `${stableHeightPx}px`);
    if (isUsableViewportHeight(fullscreenViewportHeight)) {
      el.style.setProperty(
        fullscreenViewportCssVarName,
        `${fullscreenViewportHeight}px`,
      );
    }
    el.style.setProperty(
      shortCssVarName,
      `${shortHeightPx ?? stableHeightPx}px`,
    );
    el.style.setProperty(longCssVarName, `${longHeightPx ?? stableHeightPx}px`);
  }, [
    cssVarName,
    elementRef,
    enabled,
    fullscreenViewportCssVarName,
    longCssVarName,
    longHeightPx,
    shortHeightPx,
    shortCssVarName,
    stableHeightPx,
  ]);

  useLayoutEffect(() => {
    if (!enabled || navigationKey === undefined) return;

    const previousNavigationKey = previousNavigationKeyRef.current;
    previousNavigationKeyRef.current = navigationKey;

    // The first key is direct entry, not client navigation; Chrome may overreport then.
    if (previousNavigationKey === undefined) return;
    if (previousNavigationKey === navigationKey) return;

    const { hasCoarsePointer, canHover } = getInteractionCapabilities();
    if ((!hasCoarsePointer && canHover) || !isChrome() || getIsFullscreen()) {
      chromeNavigationUsesLongHeightRef.current = false;
      chromeNavigationHasUserScrollRef.current = false;
      return;
    }

    const cache = getMobileViewportHeightCache(widthChangeThresholdPx);
    const fullscreenViewportHeight =
      getChromeRouteFullscreenViewportCssValue(cache);
    if (
      !isUsableViewportHeight(cache.shortHeight) ||
      fullscreenViewportHeight === null
    ) {
      chromeNavigationUsesLongHeightRef.current = false;
      chromeNavigationHasUserScrollRef.current = false;
      if (isUsableViewportHeight(cache.shortHeight)) {
        fullscreenViewportHeightRef.current = cache.shortHeight;
        const el = elementRef?.current ?? document.documentElement;
        el.style.setProperty(
          fullscreenViewportCssVarName,
          `${cache.shortHeight}px`,
        );
      }
      return;
    }

    // On Chrome, client navigation may preserve collapsed browser chrome; let fullscreen
    // surfaces use that current measured height until the next real user scroll.
    const measuredHeight = getChromeRouteFullscreenViewportHeight(cache);
    if (
      isUsableViewportHeight(measuredHeight) &&
      measuredHeight > cache.shortHeight
    ) {
      cache.longHeight = Math.max(cache.longHeight ?? 0, measuredHeight);
    }
    chromeNavigationUsesLongHeightRef.current = true;
    chromeNavigationHasUserScrollRef.current = false;
    fullscreenViewportHeightRef.current = null;

    const el = elementRef?.current ?? document.documentElement;
    el.style.setProperty(
      fullscreenViewportCssVarName,
      fullscreenViewportHeight,
    );
    if (isUsableViewportHeight(cache.longHeight)) {
      el.style.setProperty(longCssVarName, `${cache.longHeight}px`);
    }
  }, [
    cssVarName,
    elementRef,
    enabled,
    fullscreenViewportCssVarName,
    longCssVarName,
    navigationKey,
    widthChangeThresholdPx,
  ]);

  return enabled ? stableHeightPx : null;
}
