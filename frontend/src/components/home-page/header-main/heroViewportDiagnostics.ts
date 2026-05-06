export type ViewportDebugSnapshot = {
  stableHeightPx: number | null;
  visualViewportHeight: number | null;
  visualViewportOffsetTop: number | null;
  visualViewportScale: number | null;
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
  heroPaddingTop: number | null;
  heroPaddingBottom: number | null;
  messageHeight: number | null;
  messageBottom: number | null;
  lockupTop: number | null;
  lockupHeight: number | null;
  lockupBottom: number | null;
  navHeight: number | null;
  scrollY: number | null;
  availableContentHeight: number | null;
  contentStackHeight: number | null;
  contentOvershootPx: number;
  lockupOffscreenPx: number;
  heroOvershootPx: number;
  safariSvhMismatch: boolean;
  suspicious: boolean;
};

export type HeroViewportSample = {
  delayMs: number;
  sampleLabel: string;
  sampleIndex: number;
};

const DEFAULT_HERO_VIEWPORT_SAMPLE_PLAN: HeroViewportSample[] = [
  { delayMs: 150, sampleLabel: "mount-150ms", sampleIndex: 0 },
];

const EXTENDED_HERO_VIEWPORT_SAMPLE_PLAN: HeroViewportSample[] = [
  { delayMs: 150, sampleLabel: "mount-150ms", sampleIndex: 0 },
  { delayMs: 1000, sampleLabel: "mount-1000ms", sampleIndex: 1 },
  { delayMs: 2500, sampleLabel: "mount-2500ms", sampleIndex: 2 },
];

type RoundedRect = {
  height?: number | null;
  bottom?: number | null;
  top?: number | null;
};

type RoundedComputedStyle = {
  height?: number | null;
  minHeight?: number | null;
  maxHeight?: number | null;
  paddingTop?: number | null;
  paddingBottom?: number | null;
};

export const getHeroViewportSamplePlan = (viewportBrowserLabel: string) => {
  return viewportBrowserLabel.startsWith("ios") ||
    viewportBrowserLabel.startsWith("android")
    ? EXTENDED_HERO_VIEWPORT_SAMPLE_PLAN
    : DEFAULT_HERO_VIEWPORT_SAMPLE_PLAN;
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
      visualViewportOffsetTop: null,
      visualViewportScale: null,
      innerHeight: null,
      clientHeight: null,
    };
  }

  return {
    stableHeightPx,
    visualViewportHeight: roundViewportValue(window.visualViewport?.height),
    visualViewportOffsetTop: roundViewportValue(
      window.visualViewport?.offsetTop,
    ),
    visualViewportScale:
      typeof window.visualViewport?.scale === "number" &&
      Number.isFinite(window.visualViewport.scale) &&
      window.visualViewport.scale > 0
        ? Number(window.visualViewport.scale.toFixed(3))
        : null,
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
  messageRect,
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
  messageRect?: RoundedRect | null;
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
  const messageHeight = getRoundedRectValue(messageRect?.height);
  const messageBottom = getRoundedRectValue(messageRect?.bottom);
  const lockupTop = getRoundedRectValue(lockupRect?.top);
  const lockupHeight = getRoundedRectValue(lockupRect?.height);
  const lockupBottom = getRoundedRectValue(lockupRect?.bottom);
  const navHeight = getRoundedRectValue(navRect?.height);
  const computedHeight = getRoundedRectValue(computedStyle?.height);
  const computedMinHeight = getRoundedRectValue(computedStyle?.minHeight);
  const computedMaxHeight = getRoundedRectValue(computedStyle?.maxHeight);
  const heroPaddingTop = getRoundedRectValue(computedStyle?.paddingTop);
  const heroPaddingBottom = getRoundedRectValue(computedStyle?.paddingBottom);
  const roundedScrollY = roundViewportValue(scrollY);
  const availableContentHeight =
    referenceViewportHeight !== null
      ? Math.max(
          0,
          referenceViewportHeight -
            (heroPaddingTop ?? 0) -
            (heroPaddingBottom ?? 0),
        )
      : null;
  const contentStackHeight =
    messageHeight !== null || lockupHeight !== null
      ? (messageHeight ?? 0) + (lockupHeight ?? 0)
      : null;
  const contentOvershootPx =
    contentStackHeight !== null && availableContentHeight !== null
      ? Math.max(0, contentStackHeight - availableContentHeight)
      : 0;
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
    heroPaddingTop,
    heroPaddingBottom,
    messageHeight,
    messageBottom,
    lockupTop,
    lockupHeight,
    lockupBottom,
    navHeight,
    scrollY: roundedScrollY,
    availableContentHeight,
    contentStackHeight,
    contentOvershootPx,
    lockupOffscreenPx,
    heroOvershootPx,
    safariSvhMismatch,
    suspicious,
  };
};
