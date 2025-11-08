import { useEffect, useState, useCallback, useRef } from "react";

type FitMode = "cover" | "contain";
type ViewportMode = "dynamic" | "small" | "large";

interface ScalerOutput {
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
  scale: number;
}

/**
 * useResponsiveScaler
 *
 * Calculates the dimensions and position of a fixed-aspect-ratio
 * element, scaled responsively to the viewport.
 * Automatically applies CSS variables to a given DOM element.
 *
 * @param aspectRatio width / height (default 4 / 3)
 * @param baseWidth logical width of unscaled layout (default 1280)
 * @param mode 'cover' (default) or 'contain'
 * @param elementRef optional ref to apply CSS variables
 */
export default function useResponsiveScaler(
  aspectRatio = 4 / 3,
  baseWidth = 1280,
  mode: FitMode = "cover",
  elementRef?: React.RefObject<HTMLElement | null>,
  viewportMode: ViewportMode = "small",
): ScalerOutput {
  // --- CSS viewport unit measurers (sv*, dv*, lv*) -------------------------
  let measurerEl = typeof document !== "undefined" ? document.getElementById("__vp-measure") as HTMLDivElement | null : null;
  let measurerEl2 = typeof document !== "undefined" ? document.getElementById("__vp-measure-2") as HTMLDivElement | null : null;

  const ensureMeasurers = () => {
    if (typeof document === "undefined") return { el1: null as HTMLDivElement | null, el2: null as HTMLDivElement | null };
    if (!measurerEl) {
      measurerEl = document.createElement("div");
      measurerEl.id = "__vp-measure";
      Object.assign(measurerEl.style, {
        position: "fixed",
        left: "-9999px",
        top: "-9999px",
        visibility: "hidden",
        pointerEvents: "none",
        overflow: "hidden",
        zIndex: "-1",
      } as CSSStyleDeclaration);
      document.body.appendChild(measurerEl);
    }
    if (!measurerEl2) {
      measurerEl2 = document.createElement("div");
      measurerEl2.id = "__vp-measure-2";
      Object.assign(measurerEl2.style, {
        position: "fixed",
        left: "-9999px",
        top: "-9999px",
        visibility: "hidden",
        pointerEvents: "none",
        overflow: "hidden",
        zIndex: "-1",
      } as CSSStyleDeclaration);
      document.body.appendChild(measurerEl2);
    }
    return { el1: measurerEl, el2: measurerEl2 };
  };

  const measureViewportUnits = (mode: ViewportMode) => {
    if (typeof window === "undefined" || typeof document === "undefined") return { w: 0, h: 0 };
    const { el1, el2 } = ensureMeasurers();
    if (!el1 || !el2) return { w: 0, h: 0 };
    // Choose unit set by mode
    const vwUnit = mode === "dynamic" ? "dvw" : mode === "large" ? "lvw" : "svw";
    const vhUnit = mode === "dynamic" ? "dvh" : mode === "large" ? "lvh" : "svh";
    el1.style.width = `100${vwUnit}`;
    el1.style.height = `1px`;
    el2.style.height = `100${vhUnit}`;
    el2.style.width = `1px`;
    // Read as floating pixels
    const w = el1.getBoundingClientRect().width;
    const h = el2.getBoundingClientRect().height;
    return { w, h };
  };

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
    // Preferred: use CSS viewport units if supported to get exact sv*/dv*/lv* pixels
    const cssDims = measureViewportUnits(viewportMode);
    const cssW = cssDims.w;
    const cssH = cssDims.h;

    // Fallback: current visual viewport (dynamic by nature)
    const currW = cssW || (window.visualViewport?.width ?? document.documentElement.clientWidth) || 0;
    const currH = cssH || (window.visualViewport?.height ?? document.documentElement.clientHeight) || 0;

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

    // Choose effective viewport per requested mode; prefer CSS-unit measurement, otherwise fall back to tracked min/max
    const containerWidth = cssW
      ? cssW
      : viewportMode === "dynamic"
      ? currW
      : viewportMode === "large"
      ? minMaxRef.current.maxW
      : minMaxRef.current.minW; // "small" default
    const containerHeight = cssH
      ? cssH
      : viewportMode === "dynamic"
      ? currH
      : viewportMode === "large"
      ? minMaxRef.current.maxH
      : minMaxRef.current.minH; // "small" default

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
  }, [aspectRatio, baseWidth, mode]);

  const [scaler, setScaler] = useState<ScalerOutput>(calculate);

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
    // Track visual viewport changes (address bar show/hide, insets, etc.)
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", onResize);
      window.visualViewport.addEventListener("scroll", onResize);
    }
    onResize();

    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", onResize);
        window.visualViewport.removeEventListener("scroll", onResize);
      }
    };
  }, [calculate, elementRef]);

  return scaler;
}
