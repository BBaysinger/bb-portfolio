"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { getViewportHeightPx } from "@/utils/viewport";

import { useGlobalWindowMonitor } from "../useLayoutMonitor";

import { isManagedStableViewportHeightRequiredForCurrentBrowser } from "./stableViewportHeightPolicy";
import { useViewportSettle } from "./useViewportSettle";

const WINDOW_MONITOR_DEBOUNCE = {
  resize: 0,
  orientationchange: 0,
  fullscreenchange: 0,
  visibilitychange: 0,
  scroll: -1,
} as const;

export type HeightOnlyResizeContext = {
  width: number;
  height: number;
  previousWidth: number | null;
  previousHeight: number | null;
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
  | "pointer-fine-or-shrink"
  | ((context: HeightOnlyResizeContext) => boolean);

export type StableViewportHeightMode =
  | "use-js-for-all"
  | "use-svh-for-all"
  | "use-where-required";

export interface UseStableViewportHeightOptions {
  mode?: StableViewportHeightMode;
  widthChangeThresholdPx?: number;
  heightOnlyResizePolicy?: HeightOnlyResizePolicy;
  guardTopOverscrollShrink?: boolean;
  topScrollGuardPx?: number;
}

const DEFAULT_TOP_SCROLL_GUARD_PX = 2;
const DEFAULT_TOP_VIEWPORT_OFFSET_GUARD_PX = 2;
const RECENT_HEIGHT_INCREASE_CORRECTION_WINDOW_MS = 2000;
const RECENT_HEIGHT_INCREASE_CORRECTION_DELTA_PX = 24;
const TRUSTED_VIEWPORT_CHANGE_WINDOW_MS = 1500;

// Current status:
// - This hook exists because mobile Firefox and mobile Edge had inconsistent `svh`
//   behavior in prior testing.
// - The JS path is still considered relevant only for those browsers when callers opt into
//   `use-where-required`.
// - Other mobile browsers can still distort page height during downward pull-to-refresh
//   gestures, and this hook does not fully solve that case yet.
// - That limitation is acceptable for now because the default mode stays on CSS `svh`,
//   and current testing has not shown the same downward-gesture viewport mutation issue in
//   Firefox or Edge.
export const stableViewportHeightConfig: {
  defaultMode: StableViewportHeightMode;
} = {
  defaultMode: "use-svh-for-all",
};

function isUsableViewportHeight(
  height: number | null | undefined,
): height is number {
  return typeof height === "number" && Number.isFinite(height) && height > 0;
}

function shouldEnableManagedStableViewportHeight(
  mode: StableViewportHeightMode,
) {
  if (typeof window === "undefined") return false;

  switch (mode) {
    case "use-js-for-all":
      return true;
    case "use-svh-for-all":
      return false;
    case "use-where-required":
    default:
      return isManagedStableViewportHeightRequiredForCurrentBrowser();
  }
}

function getSmallViewportHeightPx() {
  if (typeof window === "undefined") return 0;

  const candidates = [
    window.visualViewport?.height,
    window.innerHeight,
    document.documentElement?.clientHeight,
    document.body?.clientHeight,
  ].filter(isUsableViewportHeight);

  if (candidates.length === 0) return 0;

  return Math.min(...candidates.map((candidate) => Math.round(candidate)));
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

function getVisualViewportOffsetTopPx() {
  if (typeof window === "undefined") return 0;

  const offsetTop = window.visualViewport?.offsetTop;
  if (typeof offsetTop !== "number" || !Number.isFinite(offsetTop)) {
    return 0;
  }

  return Math.max(0, Math.round(offsetTop));
}

function shouldIgnoreTopViewportOffsetSample(topScrollGuardPx: number) {
  if (getIsFullscreen()) return false;

  const { hasCoarsePointer } = getInteractionCapabilities();
  if (!hasCoarsePointer) return false;
  if (window.scrollY > topScrollGuardPx) return false;

  return getVisualViewportOffsetTopPx() > DEFAULT_TOP_VIEWPORT_OFFSET_GUARD_PX;
}

function shouldIgnoreScrolledCoarsePointerSample(
  nextHeight: number,
  previousHeight: number | null,
  topScrollGuardPx: number,
) {
  if (!isUsableViewportHeight(nextHeight)) return false;
  if (getIsFullscreen()) return false;

  const { hasCoarsePointer } = getInteractionCapabilities();
  if (!hasCoarsePointer) return false;
  if (window.scrollY <= topScrollGuardPx) return false;
  if (previousHeight === null) return true;

  return nextHeight >= previousHeight;
}

function shouldIgnoreTopCoarsePointerGrowth(
  nextHeight: number,
  previousHeight: number | null,
  topScrollGuardPx: number,
) {
  if (!isUsableViewportHeight(nextHeight)) return false;
  if (getIsFullscreen()) return false;

  const { hasCoarsePointer } = getInteractionCapabilities();
  if (!hasCoarsePointer) return false;
  if (window.scrollY > topScrollGuardPx) return false;

  if (previousHeight === null) {
    const smallerTopCandidate = getSmallViewportHeightPx();
    return (
      isUsableViewportHeight(smallerTopCandidate) &&
      nextHeight > smallerTopCandidate
    );
  }

  return nextHeight > previousHeight;
}

function getInitialStableHeightPx(topScrollGuardPx: number) {
  if (shouldIgnoreTopViewportOffsetSample(topScrollGuardPx)) {
    const smallerTopCandidate = getSmallViewportHeightPx();
    return isUsableViewportHeight(smallerTopCandidate)
      ? smallerTopCandidate
      : null;
  }

  const { hasCoarsePointer } = getInteractionCapabilities();
  const initialHeight =
    hasCoarsePointer && window.scrollY <= topScrollGuardPx
      ? getSmallViewportHeightPx()
      : getViewportHeightPx();

  if (
    shouldIgnoreScrolledCoarsePointerSample(
      initialHeight,
      null,
      topScrollGuardPx,
    )
  ) {
    return null;
  }

  return isUsableViewportHeight(initialHeight) ? initialHeight : null;
}

function getFallbackStableHeightPx(
  nextHeight: number,
  previousHeight: number | null,
  topScrollGuardPx: number,
) {
  if (
    shouldIgnoreTopViewportOffsetSample(topScrollGuardPx) ||
    shouldIgnoreTopCoarsePointerGrowth(
      nextHeight,
      previousHeight,
      topScrollGuardPx,
    )
  ) {
    const smallerTopCandidate = getSmallViewportHeightPx();
    if (isUsableViewportHeight(smallerTopCandidate)) {
      return smallerTopCandidate;
    }
  }

  return null;
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
  const {
    mode,
    widthChangeThresholdPx = 60,
    heightOnlyResizePolicy = "never",
    guardTopOverscrollShrink = true,
    topScrollGuardPx = DEFAULT_TOP_SCROLL_GUARD_PX,
  } = options;
  const resolvedMode = mode ?? stableViewportHeightConfig.defaultMode;
  const isEnabled = shouldEnableManagedStableViewportHeight(resolvedMode);

  const [stableHeightPx, setStableHeightPx] = useState<number | null>(() =>
    isEnabled ? getInitialStableHeightPx(topScrollGuardPx) : null,
  );
  const initialHeightRef = useRef<number | null>(stableHeightPx);
  const mountedAtRef = useRef<number | null>(null);
  const lastWidthRef = useRef<number | null>(null);
  const lastHeightRef = useRef<number | null>(stableHeightPx);
  const lastHeightIncreaseRef = useRef<{
    height: number;
    timestamp: number;
  } | null>(null);
  const forcedHeightCommitUntilRef = useRef<number>(0);
  const resizeSettleTimeoutRef = useRef<number | null>(null);
  const resizeRafRef = useRef<number | null>(null);

  const getWidthDelta = useCallback((width: number) => {
    const lastWidth = lastWidthRef.current;
    if (lastWidth == null) return null;
    return Math.abs(width - lastWidth);
  }, []);

  const shouldGuardTopOverscrollShrink = useCallback(
    (height: number) => {
      if (!guardTopOverscrollShrink || !isUsableViewportHeight(height))
        return false;

      const previousHeight = lastHeightRef.current;
      if (!isUsableViewportHeight(previousHeight) || height >= previousHeight) {
        return false;
      }

      if (
        mountedAtRef.current !== null &&
        initialHeightRef.current !== null &&
        initialHeightRef.current === previousHeight &&
        previousHeight - height <= RECENT_HEIGHT_INCREASE_CORRECTION_DELTA_PX &&
        Date.now() - mountedAtRef.current <=
          RECENT_HEIGHT_INCREASE_CORRECTION_WINDOW_MS
      ) {
        return false;
      }

      const recentHeightIncrease = lastHeightIncreaseRef.current;
      if (
        recentHeightIncrease !== null &&
        recentHeightIncrease.height === previousHeight &&
        previousHeight - height <= RECENT_HEIGHT_INCREASE_CORRECTION_DELTA_PX &&
        Date.now() - recentHeightIncrease.timestamp <=
          RECENT_HEIGHT_INCREASE_CORRECTION_WINDOW_MS
      ) {
        return false;
      }

      if (getIsFullscreen()) return false;

      const { hasCoarsePointer } = getInteractionCapabilities();
      if (!hasCoarsePointer) return false;

      return window.scrollY <= topScrollGuardPx;
    },
    [guardTopOverscrollShrink, topScrollGuardPx],
  );

  const armForcedHeightCommitWindow = useCallback((durationMs?: number) => {
    const windowMs = durationMs ?? TRUSTED_VIEWPORT_CHANGE_WINDOW_MS;
    forcedHeightCommitUntilRef.current = Math.max(
      forcedHeightCommitUntilRef.current,
      Date.now() + windowMs,
    );
  }, []);

  const shouldForceHeightCommit = useCallback(
    () => forcedHeightCommitUntilRef.current > Date.now(),
    [],
  );

  const applyStableHeightPx = useCallback(
    (height: number, force = false) => {
      const previousHeight = lastHeightRef.current;
      const bypassTransientGuards = force || shouldForceHeightCommit();
      const fallbackHeight = bypassTransientGuards
        ? null
        : getFallbackStableHeightPx(height, previousHeight, topScrollGuardPx);

      if (
        (!isUsableViewportHeight(height) &&
          !isUsableViewportHeight(fallbackHeight)) ||
        (!bypassTransientGuards &&
          (shouldIgnoreTopViewportOffsetSample(topScrollGuardPx) ||
            shouldIgnoreScrolledCoarsePointerSample(
              height,
              previousHeight,
              topScrollGuardPx,
            ) ||
            shouldIgnoreTopCoarsePointerGrowth(
              height,
              previousHeight,
              topScrollGuardPx,
            ) ||
            shouldGuardTopOverscrollShrink(height)) &&
          !isUsableViewportHeight(fallbackHeight))
      ) {
        return;
      }

      const nextHeight = isUsableViewportHeight(fallbackHeight)
        ? fallbackHeight
        : height;

      lastHeightRef.current = nextHeight;
      if (
        isUsableViewportHeight(previousHeight) &&
        nextHeight > previousHeight
      ) {
        lastHeightIncreaseRef.current = {
          height: nextHeight,
          timestamp: Date.now(),
        };
      } else if (
        lastHeightIncreaseRef.current !== null &&
        nextHeight <= lastHeightIncreaseRef.current.height
      ) {
        lastHeightIncreaseRef.current = null;
      }
      if (
        initialHeightRef.current !== null &&
        nextHeight <= initialHeightRef.current
      ) {
        initialHeightRef.current = null;
      }
      setStableHeightPx((prev) => (prev === nextHeight ? prev : nextHeight));
    },
    [shouldForceHeightCommit, shouldGuardTopOverscrollShrink, topScrollGuardPx],
  );

  const measureStableHeightPx = useCallback(
    (force = false) => {
      applyStableHeightPx(getViewportHeightPx(), force);
    },
    [applyStableHeightPx],
  );

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
        case "pointer-fine-or-shrink":
          return (
            (!fullContext.hasCoarsePointer && fullContext.canHover) ||
            (fullContext.previousHeight !== null &&
              fullContext.height < fullContext.previousHeight)
          );
        case "never":
        default:
          return false;
      }
    },
    [heightOnlyResizePolicy],
  );

  const scheduleTrailingMeasure = useCallback(
    (force = false) => {
      if (force) {
        armForcedHeightCommitWindow();
      }

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
          measureStableHeightPx(force);
        });
      }, 120);
    },
    [armForcedHeightCommitWindow, measureStableHeightPx],
  );

  const onWindowEvent = useCallback(
    (
      eventType:
        | "resize"
        | "scroll"
        | "orientationchange"
        | "fullscreenchange"
        | "visibilitychange",
    ) => {
      if (eventType === "orientationchange") {
        armForcedHeightCommitWindow();
        if (resizeSettleTimeoutRef.current !== null) {
          window.clearTimeout(resizeSettleTimeoutRef.current);
          resizeSettleTimeoutRef.current = null;
        }
        measureStableHeightPx(true);
        scheduleTrailingMeasure(true);
        return;
      }

      if (eventType === "fullscreenchange") {
        scheduleTrailingMeasure(true);
        return;
      }

      if (eventType === "visibilitychange") {
        scheduleTrailingMeasure();
        return;
      }

      const width = window.innerWidth;
      const widthDelta = getWidthDelta(width);
      const height = getViewportHeightPx();
      const previousWidth = lastWidthRef.current;
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
        armForcedHeightCommitWindow();
        measureStableHeightPx(true);
        return;
      }

      if (
        heightDelta !== null &&
        heightDelta > 0 &&
        shouldTrustHeightOnlyResize({
          width,
          height,
          previousWidth,
          previousHeight: lastHeight,
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
      armForcedHeightCommitWindow,
      getWidthDelta,
      measureStableHeightPx,
      scheduleTrailingMeasure,
      shouldTrustHeightOnlyResize,
      widthChangeThresholdPx,
    ],
  );

  useGlobalWindowMonitor(onWindowEvent, WINDOW_MONITOR_DEBOUNCE, isEnabled);

  useEffect(() => {
    if (!isEnabled) {
      initialHeightRef.current = null;
      lastHeightRef.current = null;
      lastHeightIncreaseRef.current = null;
      lastWidthRef.current = null;
      forcedHeightCommitUntilRef.current = 0;
      return;
    }

    const viewport = window.visualViewport;
    if (!viewport) return;

    const onVisualViewportChange = () => {
      const width = Math.round(viewport.width || window.innerWidth || 0);
      const height = Math.round(viewport.height || getViewportHeightPx() || 0);
      const widthDelta = getWidthDelta(width);
      const previousWidth = lastWidthRef.current;
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
            previousWidth,
            previousHeight: lastHeight,
            widthDelta,
            heightDelta,
            isFullscreen,
          }))
      ) {
        scheduleTrailingMeasure(
          widthDelta !== null && widthDelta >= widthChangeThresholdPx,
        );
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
  }, [
    isEnabled,
    getWidthDelta,
    scheduleTrailingMeasure,
    shouldTrustHeightOnlyResize,
    widthChangeThresholdPx,
  ]);

  useEffect(() => {
    if (!isEnabled) return;

    mountedAtRef.current = Date.now();
    lastWidthRef.current = window.innerWidth;
    if (!isUsableViewportHeight(lastHeightRef.current)) {
      lastHeightRef.current = null;
      scheduleTrailingMeasure();
    }

    return () => {
      if (resizeSettleTimeoutRef.current !== null) {
        window.clearTimeout(resizeSettleTimeoutRef.current);
      }
      if (resizeRafRef.current !== null) {
        window.cancelAnimationFrame(resizeRafRef.current);
      }
    };
  }, [isEnabled, scheduleTrailingMeasure]);

  const onViewportSettle = useCallback(() => {
    lastWidthRef.current = window.innerWidth;
    measureStableHeightPx();
  }, [measureStableHeightPx]);

  useViewportSettle(onViewportSettle, { enabled: isEnabled });

  return isEnabled ? stableHeightPx : null;
}
