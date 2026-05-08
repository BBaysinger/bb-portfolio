import { getViewportHeightPx } from "@/utils/viewport";

const DEFAULT_TOP_VIEWPORT_OFFSET_GUARD_PX = 2;
const RECENT_HEIGHT_INCREASE_CORRECTION_WINDOW_MS = 2000;
const RECENT_HEIGHT_INCREASE_CORRECTION_DELTA_PX = 24;

export interface InteractionCapabilities {
  hasCoarsePointer: boolean;
  canHover: boolean;
}

export interface HeightIncreaseSample {
  height: number;
  timestamp: number;
}

export interface StableHeightResolutionContext {
  nextHeight: number;
  previousHeight: number | null;
  topScrollGuardPx: number;
  guardTopOverscrollShrink: boolean;
  mountedAt: number | null;
  initialHeight: number | null;
  recentHeightIncrease: HeightIncreaseSample | null;
  bypassTransientGuards: boolean;
  now?: number;
}

export function isUsableViewportHeight(
  height: number | null | undefined,
): height is number {
  return typeof height === "number" && Number.isFinite(height) && height > 0;
}

export function getInteractionCapabilities(): InteractionCapabilities {
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

export function getIsFullscreen() {
  return typeof document !== "undefined" && Boolean(document.fullscreenElement);
}

export function getSmallViewportHeightPx() {
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

export function getVisualViewportOffsetTopPx() {
  if (typeof window === "undefined") return 0;

  const offsetTop = window.visualViewport?.offsetTop;
  if (typeof offsetTop !== "number" || !Number.isFinite(offsetTop)) {
    return 0;
  }

  return Math.max(0, Math.round(offsetTop));
}

export function shouldIgnoreTopViewportOffsetSample(topScrollGuardPx: number) {
  if (getIsFullscreen()) return false;

  const { hasCoarsePointer } = getInteractionCapabilities();
  if (!hasCoarsePointer) return false;
  if (window.scrollY > topScrollGuardPx) return false;

  return getVisualViewportOffsetTopPx() > DEFAULT_TOP_VIEWPORT_OFFSET_GUARD_PX;
}

export function shouldIgnoreScrolledCoarsePointerSample(
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

export function shouldIgnoreTopCoarsePointerGrowth(
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

export function getInitialStableHeightPx(topScrollGuardPx: number) {
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

export function getFallbackStableHeightPx(
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

export function shouldGuardTopOverscrollShrink({
  nextHeight,
  previousHeight,
  topScrollGuardPx,
  guardTopOverscrollShrink,
  mountedAt,
  initialHeight,
  recentHeightIncrease,
  now = Date.now(),
}: StableHeightResolutionContext) {
  if (!guardTopOverscrollShrink || !isUsableViewportHeight(nextHeight)) {
    return false;
  }

  if (!isUsableViewportHeight(previousHeight) || nextHeight >= previousHeight) {
    return false;
  }

  if (
    mountedAt !== null &&
    initialHeight !== null &&
    initialHeight === previousHeight &&
    previousHeight - nextHeight <= RECENT_HEIGHT_INCREASE_CORRECTION_DELTA_PX &&
    now - mountedAt <= RECENT_HEIGHT_INCREASE_CORRECTION_WINDOW_MS
  ) {
    return false;
  }

  if (
    recentHeightIncrease !== null &&
    recentHeightIncrease.height === previousHeight &&
    previousHeight - nextHeight <= RECENT_HEIGHT_INCREASE_CORRECTION_DELTA_PX &&
    now - recentHeightIncrease.timestamp <=
      RECENT_HEIGHT_INCREASE_CORRECTION_WINDOW_MS
  ) {
    return false;
  }

  if (getIsFullscreen()) return false;

  const { hasCoarsePointer } = getInteractionCapabilities();
  if (!hasCoarsePointer) return false;

  return window.scrollY <= topScrollGuardPx;
}

export function resolveStableHeightCandidate(
  context: StableHeightResolutionContext,
) {
  const {
    nextHeight,
    previousHeight,
    topScrollGuardPx,
    bypassTransientGuards,
  } = context;

  const fallbackHeight = bypassTransientGuards
    ? null
    : getFallbackStableHeightPx(nextHeight, previousHeight, topScrollGuardPx);

  if (
    (!isUsableViewportHeight(nextHeight) &&
      !isUsableViewportHeight(fallbackHeight)) ||
    (!bypassTransientGuards &&
      (shouldIgnoreTopViewportOffsetSample(topScrollGuardPx) ||
        shouldIgnoreScrolledCoarsePointerSample(
          nextHeight,
          previousHeight,
          topScrollGuardPx,
        ) ||
        shouldIgnoreTopCoarsePointerGrowth(
          nextHeight,
          previousHeight,
          topScrollGuardPx,
        ) ||
        shouldGuardTopOverscrollShrink(context)) &&
      !isUsableViewportHeight(fallbackHeight))
  ) {
    return null;
  }

  return isUsableViewportHeight(fallbackHeight) ? fallbackHeight : nextHeight;
}