import {
  useEffect,
  useLayoutEffect,
  useState,
  useCallback,
  useRef,
} from "react";

type FitMode = "cover" | "contain";
type ViewportMode = "dynamic" | "small" | "large";

interface ScalerOutput {
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
  scale: number;
}

let viewportMeasureEl: HTMLDivElement | null = null;
let viewportMeasureEl2: HTMLDivElement | null = null;

const ensureViewportMeasurers = () => {
  if (typeof document === "undefined") {
    return {
      el1: null as HTMLDivElement | null,
      el2: null as HTMLDivElement | null,
    };
  }

  if (!viewportMeasureEl) {
    viewportMeasureEl = document.getElementById(
      "__vp-measure",
    ) as HTMLDivElement | null;
  }
  if (!viewportMeasureEl) {
    viewportMeasureEl = document.createElement("div");
    viewportMeasureEl.id = "__vp-measure";
    Object.assign(viewportMeasureEl.style, {
      position: "fixed",
      left: "-9999px",
      top: "-9999px",
      visibility: "hidden",
      pointerEvents: "none",
      overflow: "hidden",
      zIndex: "-1",
    } as CSSStyleDeclaration);
    document.body.appendChild(viewportMeasureEl);
  }

  if (!viewportMeasureEl2) {
    viewportMeasureEl2 = document.getElementById(
      "__vp-measure-2",
    ) as HTMLDivElement | null;
  }
  if (!viewportMeasureEl2) {
    viewportMeasureEl2 = document.createElement("div");
    viewportMeasureEl2.id = "__vp-measure-2";
    Object.assign(viewportMeasureEl2.style, {
      position: "fixed",
      left: "-9999px",
      top: "-9999px",
      visibility: "hidden",
      pointerEvents: "none",
      overflow: "hidden",
      zIndex: "-1",
    } as CSSStyleDeclaration);
    document.body.appendChild(viewportMeasureEl2);
  }

  return { el1: viewportMeasureEl, el2: viewportMeasureEl2 };
};

const measureViewportUnits = (mode: ViewportMode) => {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return { w: 0, h: 0 };
  }

  const { el1, el2 } = ensureViewportMeasurers();
  if (!el1 || !el2) return { w: 0, h: 0 };

  const vwUnit = mode === "dynamic" ? "dvw" : mode === "large" ? "lvw" : "svw";
  const vhUnit = mode === "dynamic" ? "dvh" : mode === "large" ? "lvh" : "svh";

  el1.style.width = `100${vwUnit}`;
  el1.style.height = "1px";
  el2.style.height = `100${vhUnit}`;
  el2.style.width = "1px";

  const w = el1.getBoundingClientRect().width;
  const h = el2.getBoundingClientRect().height;
  return { w, h };
};

/**
 * useResponsiveScaler
 *
 * A viewport-accurate, fixed-aspect responsive scaler that returns the pixel
 * dimensions and offsets for a layout while preserving a caller-specified aspect ratio
 * (e.g., 4:3). The ratio is "fixed" only in the sense that the hook maintains the
 * value you pass in across viewport changes; supplying a different `aspectRatio`
 * on re-render will recompute using that new ratio.
 * and optionally writes those values as CSS variables on a target element.
 *
 * Accuracy and stability:
 * - Primarily measures CSS viewport units directly (svw/svh, dvw/dvh, lvw/lvh)
 *   via offscreen elements for pixel-accurate dimensions that match CSS.
 * - When CSS unit measurement isn’t available, falls back to visualViewport
 *   (or documentElement client size) and tracks min/max per orientation to emulate
 *   the CSS “small” and “large” viewport semantics.
 *
 * Viewport modes (maps to CSS viewport unit families):
 * - "small"   → stable viewport (svw/svh): minimum across address bar show/hide.
 * - "dynamic" → dynamic viewport (dvw/dvh): reflects real-time changes.
 * - "large"   → large viewport (lvw/lvh): maximum across current orientation.
 *
 * Returned values and CSS variables:
 * - width, height: scaled content box in pixels that preserves the requested
 *   aspectRatio using either cover or contain behavior.
 * - offsetX, offsetY: remaining horizontal/vertical free space divided by two
 *   (useful for centering or translating content inside the viewport box).
 * - scale: width / baseWidth; convenient for scaling child measurements.
 * - If `elementRef` is provided and resolves to an HTMLElement, the hook sets:
 *   --responsive-scaler-width, --responsive-scaler-height,
 *   --responsive-scaler-offset-x, --responsive-scaler-offset-y,
 *   --responsive-scaler-scale.
 *
 * Inputs:
 * @param aspectRatio width / height (default 4 / 3)
 * @param baseWidth   logical width of unscaled layout (default 1280)
 * @param mode        'cover' (default) or 'contain'
 * @param elementRef  optional ref; when provided, CSS variables are written
 * @param viewportMode "small" | "dynamic" | "large" (default "small"). See above.
 *
 * Events and perf:
 * - Subscribes to window resize, orientationchange, and visualViewport resize/scroll.
 * - Work is light and throttling is typically unnecessary; debounce externally if needed.
 *
 * Example (apply CSS vars on a wrapper):
 * const wrapperRef = useRef<HTMLDivElement>(null);
 * const scaler = useResponsiveScaler(4/3, 1280, 'cover', wrapperRef, 'small');
 *
 * Example (values only, no elementRef):
 * const { width, height, offsetX, offsetY, scale } = useResponsiveScaler(16/9, 1920);
 */
export default function useResponsiveScaler(
  aspectRatio = 4 / 3,
  baseWidth = 1280,
  mode: FitMode = "cover",
  elementRef?: React.RefObject<HTMLElement | null>,
  viewportMode: ViewportMode = "small",
): ScalerOutput {
  const useIsomorphicLayoutEffect =
    typeof window === "undefined" ? useEffect : useLayoutEffect;

  // Track min/max visual viewport across the current orientation to emulate CSS svh/svh and lvh/lvw.
  const minMaxRef = useRef({
    minW: Number.POSITIVE_INFINITY,
    minH: Number.POSITIVE_INFINITY,
    maxW: 0,
    maxH: 0,
    // crude orientation bucket: portrait vs landscape
    isPortrait: undefined as undefined | boolean,
  });

  const calculate = useCallback((): ScalerOutput => {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return {
        width: 0,
        height: 0,
        offsetX: 0,
        offsetY: 0,
        scale: 1,
      };
    }

    // If the app is already computing a stable viewport height (used by the hero),
    // prefer that for "small" mode so we stay immune to Firefox UI chrome changes.
    // This keeps the scaler's math/strategy the same; it only swaps the height input.
    const rootStableClientHeightPx = (() => {
      try {
        const raw = window
          .getComputedStyle(document.documentElement)
          .getPropertyValue("--client-height")
          .trim();
        const parsed = Number.parseFloat(raw);
        return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
      } catch {
        return 0;
      }
    })();

    const docW = document.documentElement.clientWidth || 0;
    const docH = document.documentElement.clientHeight || 0;

    // Use visualViewport as the source of truth for *dynamic* viewport size.
    // On iOS Safari, CSS viewport units can occasionally report a stale value on
    // initial load; visualViewport typically corrects sooner and emits events.
    const vvW = window.visualViewport?.width ?? docW;
    const vvH = window.visualViewport?.height ?? docH;

    // Preferred: use CSS viewport units if supported to get exact sv*/dv*/lv* pixels.
    // Validate against visualViewport/docElement to avoid iOS Safari transient mis-measure.
    const cssDims = measureViewportUnits(viewportMode);
    const cssWRaw = Number.isFinite(cssDims.w) ? cssDims.w : 0;
    const cssHRaw = Number.isFinite(cssDims.h) ? cssDims.h : 0;

    const pickCssAxis = (
      css: number,
      vv: number,
      doc: number,
      axisMode: ViewportMode,
    ) => {
      if (css <= 0) return 0;
      const vvSafe = vv > 0 ? vv : doc;
      const docSafe = doc > 0 ? doc : vv;
      const upper = Math.min(
        css,
        vvSafe > 0 ? vvSafe : css,
        docSafe > 0 ? docSafe : css,
      );
      const lower = Math.max(
        css,
        vvSafe > 0 ? vvSafe : css,
        docSafe > 0 ? docSafe : css,
      );

      // Heuristics:
      // - small: should never exceed the current dynamic viewport (vv/doc).
      // - dynamic: should closely match vv/doc; if it doesn't, trust vv/doc.
      // - large: should be >= current dynamic viewport.
      if (axisMode === "small") {
        return upper;
      }
      if (axisMode === "large") {
        return lower;
      }

      // dynamic
      if (vvSafe > 0) {
        const delta = Math.abs(css - vvSafe) / Math.max(1, vvSafe);
        if (delta > 0.03) return 0;
      }
      return css;
    };

    const cssW = pickCssAxis(cssWRaw, vvW, docW, viewportMode);
    const cssH = pickCssAxis(cssHRaw, vvH, docH, viewportMode);

    // Current dynamic viewport for min/max tracking and orientation bucketing.
    const currW = vvW || docW || 0;
    const currH = vvH || docH || 0;

    // Reset min/max if orientation bucket flips
    const isPortrait = currH >= currW;
    if (minMaxRef.current.isPortrait === undefined) {
      minMaxRef.current.isPortrait = isPortrait;
    } else if (minMaxRef.current.isPortrait !== isPortrait) {
      minMaxRef.current = {
        minW: currW,
        minH: currH,
        maxW: currW,
        maxH: currH,
        isPortrait,
      };
    }

    // Update min/max trackers
    minMaxRef.current.minW = Math.min(minMaxRef.current.minW, currW);
    minMaxRef.current.minH = Math.min(minMaxRef.current.minH, currH);
    minMaxRef.current.maxW = Math.max(minMaxRef.current.maxW, currW);
    minMaxRef.current.maxH = Math.max(minMaxRef.current.maxH, currH);

    // Choose effective viewport per requested mode; prefer validated CSS-unit measurement,
    // otherwise fall back to tracked min/max (or current dynamic viewport).
    const containerWidth = cssW
      ? cssW
      : viewportMode === "dynamic"
        ? currW
        : viewportMode === "large"
          ? minMaxRef.current.maxW
          : minMaxRef.current.minW; // "small" default
    const containerHeightRaw = cssH
      ? cssH
      : viewportMode === "dynamic"
        ? currH
        : viewportMode === "large"
          ? minMaxRef.current.maxH
          : minMaxRef.current.minH; // "small" default

    const containerHeight =
      viewportMode === "small" && rootStableClientHeightPx > 0
        ? rootStableClientHeightPx
        : containerHeightRaw;

    const screenAspect = containerWidth / Math.max(1, containerHeight);

    let width: number, height: number;

    const useWidth =
      mode === "contain"
        ? screenAspect < aspectRatio
        : screenAspect > aspectRatio;

    if (useWidth) {
      width = containerWidth;
      height = width / aspectRatio;
    } else {
      height = containerHeight;
      width = height * aspectRatio;
    }

    const offsetX = (containerWidth - width) / 2;
    const offsetY = (containerHeight - height) / 2;
    const scale = width / baseWidth;

    return { width, height, offsetX, offsetY, scale };
  }, [aspectRatio, baseWidth, mode, viewportMode]);

  const [scaler, setScaler] = useState<ScalerOutput>(calculate);

  // Ensure CSS vars are present before first paint on mobile Safari.
  // iOS Safari can sometimes render 0-sized fixed-aspect layers until a
  // subsequent viewport event (rotation/scroll) forces a relayout.
  useIsomorphicLayoutEffect(() => {
    if (!elementRef?.current) return;

    elementRef.current.style.setProperty(
      "--responsive-scaler-width",
      `${scaler.width}px`,
    );
    elementRef.current.style.setProperty(
      "--responsive-scaler-height",
      `${scaler.height}px`,
    );
    elementRef.current.style.setProperty(
      "--responsive-scaler-offset-x",
      `${scaler.offsetX}px`,
    );
    elementRef.current.style.setProperty(
      "--responsive-scaler-offset-y",
      `${scaler.offsetY}px`,
    );
    elementRef.current.style.setProperty(
      "--responsive-scaler-scale",
      `${scaler.scale}`,
    );
  }, [elementRef, scaler, useIsomorphicLayoutEffect]);

  useEffect(() => {
    const applyCssVars = (el: HTMLElement, data: ScalerOutput) => {
      el.style.setProperty("--responsive-scaler-width", `${data.width}px`);
      el.style.setProperty("--responsive-scaler-height", `${data.height}px`);
      el.style.setProperty("--responsive-scaler-offset-x", `${data.offsetX}px`);
      el.style.setProperty("--responsive-scaler-offset-y", `${data.offsetY}px`);
      el.style.setProperty("--responsive-scaler-scale", `${data.scale}`);
    };

    const onResize = () => {
      const newScaler = calculate();
      setScaler(newScaler);
      if (elementRef?.current) {
        applyCssVars(elementRef.current, newScaler);
      }
    };

    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    // BFCache restores and tab visibility changes can leave iOS Safari in a
    // stale viewport state until the next interaction.
    window.addEventListener("pageshow", onResize);
    const onVisibility = () => {
      if (document.visibilityState === "visible") onResize();
    };
    document.addEventListener("visibilitychange", onVisibility);
    // Track visual viewport changes (address bar show/hide, insets, etc.)
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", onResize);
      window.visualViewport.addEventListener("scroll", onResize);
    }
    onResize();

    // iOS Safari can occasionally start with a transient, incorrect viewport
    // measurement that corrects itself shortly after initial paint. If that
    // happens without emitting a resize/orientation event, the scaler can stay
    // wrong until rotation. A small, bounded retry sequence mitigates this.
    let canceled = false;
    let raf1: number | null = null;
    let raf2: number | null = null;
    let timeoutId: number | null = null;

    const safeResize = () => {
      if (canceled) return;
      onResize();
    };

    raf1 = window.requestAnimationFrame(safeResize);
    raf2 = window.requestAnimationFrame(() => {
      raf2 = window.requestAnimationFrame(safeResize);
    });
    timeoutId = window.setTimeout(safeResize, 250);

    return () => {
      canceled = true;
      if (raf1 !== null) window.cancelAnimationFrame(raf1);
      if (raf2 !== null) window.cancelAnimationFrame(raf2);
      if (timeoutId !== null) window.clearTimeout(timeoutId);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
      window.removeEventListener("pageshow", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", onResize);
        window.visualViewport.removeEventListener("scroll", onResize);
      }
    };
  }, [calculate, elementRef]);

  return scaler;
}
