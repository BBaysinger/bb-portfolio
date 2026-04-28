export type ViewportDebugSnapshot = {
  stableHeightPx: number | null;
  visualViewportHeight: number | null;
  innerHeight: number | null;
  clientHeight: number | null;
};

export type HeroViewportRumPayload = ViewportDebugSnapshot & {
  browser: string;
  mode: "svh" | "managed";
  sampleLabel: string;
  sampleIndex: number;
  referenceViewportHeight: number | null;
  heroHeight: number | null;
  heroBottom: number | null;
  computedHeight: number | null;
  computedMinHeight: number | null;
  computedMaxHeight: number | null;
  lockupTop: number | null;
  lockupBottom: number | null;
  navHeight: number | null;
  scrollY: number | null;
  lockupOffscreenPx: number;
  heroOvershootPx: number;
  safariSvhMismatch: boolean;
  suspicious: boolean;
};

type RoundedRect = {
  height?: number | null;
  bottom?: number | null;
  top?: number | null;
};

type RoundedComputedStyle = {
  height?: number | null;
  minHeight?: number | null;
  maxHeight?: number | null;
};

export const roundViewportValue = (value: number | null | undefined) => {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return null;
  }

  return Math.round(value);
};

export const getRoundedRectValue = (value: number | null | undefined) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.round(value);
};

export const parseComputedPixelValue = (value: string | null | undefined) => {
  if (!value || value === "none" || value === "auto") return null;

  const parsedValue = Number.parseFloat(value);
  if (!Number.isFinite(parsedValue) || parsedValue <= 0) return null;

  return Math.round(parsedValue);
};

export const getViewportDebugSnapshot = (
  stableHeightPx: number | null,
): ViewportDebugSnapshot => {
  if (typeof window === "undefined") {
    return {
      stableHeightPx,
      visualViewportHeight: null,
      innerHeight: null,
      clientHeight: null,
    };
  }

  return {
    stableHeightPx,
    visualViewportHeight: roundViewportValue(window.visualViewport?.height),
    innerHeight: roundViewportValue(window.innerHeight),
    clientHeight: roundViewportValue(document.documentElement?.clientHeight),
  };
};

export const buildHeroViewportRumPayload = ({
  viewport,
  viewportHeightMode,
  viewportBrowserLabel,
  sampleLabel,
  sampleIndex,
  heroRect,
  lockupRect,
  navRect,
  computedStyle,
  scrollY,
}: {
  viewport: ViewportDebugSnapshot;
  viewportHeightMode: "svh" | "managed";
  viewportBrowserLabel: string;
  sampleLabel: string;
  sampleIndex: number;
  heroRect?: RoundedRect | null;
  lockupRect?: RoundedRect | null;
  navRect?: RoundedRect | null;
  computedStyle?: RoundedComputedStyle | null;
  scrollY?: number | null;
}): HeroViewportRumPayload => {
  const referenceViewportHeight =
    viewport.visualViewportHeight ??
    viewport.innerHeight ??
    viewport.clientHeight ??
    viewport.stableHeightPx ??
    null;
  const heroHeight = getRoundedRectValue(heroRect?.height);
  const heroBottom = getRoundedRectValue(heroRect?.bottom);
  const lockupTop = getRoundedRectValue(lockupRect?.top);
  const lockupBottom = getRoundedRectValue(lockupRect?.bottom);
  const navHeight = getRoundedRectValue(navRect?.height);
  const computedHeight = getRoundedRectValue(computedStyle?.height);
  const computedMinHeight = getRoundedRectValue(computedStyle?.minHeight);
  const computedMaxHeight = getRoundedRectValue(computedStyle?.maxHeight);
  const roundedScrollY = roundViewportValue(scrollY);
  const lockupOffscreenPx =
    lockupBottom !== null && referenceViewportHeight !== null
      ? Math.max(0, lockupBottom - referenceViewportHeight)
      : 0;
  const heroOvershootPx =
    heroHeight !== null && referenceViewportHeight !== null
      ? Math.max(0, heroHeight - referenceViewportHeight)
      : 0;
  const suspicious = lockupOffscreenPx >= 24 || heroOvershootPx >= 24;
  const safariSvhMismatch =
    viewportBrowserLabel.endsWith("safari") &&
    viewportHeightMode === "svh" &&
    suspicious;

  return {
    ...viewport,
    browser: viewportBrowserLabel,
    mode: viewportHeightMode,
    sampleLabel,
    sampleIndex,
    referenceViewportHeight,
    heroHeight,
    heroBottom,
    computedHeight,
    computedMinHeight,
    computedMaxHeight,
    lockupTop,
    lockupBottom,
    navHeight,
    scrollY: roundedScrollY,
    lockupOffscreenPx,
    heroOvershootPx,
    safariSvhMismatch,
    suspicious,
  };
};