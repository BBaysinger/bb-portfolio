import type React from "react";
import { useEffect, useMemo, useState } from "react";

interface UseTransformScaleFallbackOptions {
  minScale: number;
  maxScale: number;
  minViewport: number;
  maxViewport: number;
  preserveTransform?: string;
  testTransform?: string;
}

interface UseTransformScaleFallbackResult {
  needsFallback: boolean;
  transformStyle: React.CSSProperties | undefined;
  scale: number;
}

const deriveScale = (
  widthPx: number,
  minViewport: number,
  maxViewport: number,
  minScale: number,
  maxScale: number,
): number => {
  if (widthPx <= minViewport) return minScale;
  if (widthPx >= maxViewport) return maxScale;
  const progress = (widthPx - minViewport) / (maxViewport - minViewport);
  return Number((minScale + (maxScale - minScale) * progress).toFixed(4));
};

const DEFAULT_TEST_TRANSFORM = "scale(clamp(0.5, 1vw, 1))";

const enqueueMicrotask = (cb: () => void) => {
  if (typeof queueMicrotask === "function") {
    queueMicrotask(cb);
  } else {
    Promise.resolve().then(cb);
  }
};

/**
 * Detects when transforms that rely on scale(clamp()) are rejected (Firefox) and
 * emits an equivalent inline transform so components keep their responsive zoom.
 *
 * Pair this with the `scaleRange` mixin: browsers that accept clamp maintain the
 * SCSS output, while Gecko receives the JS-driven fallback style.
 */
export function useTransformScaleFallback(
  options: UseTransformScaleFallbackOptions,
): UseTransformScaleFallbackResult {
  const {
    minScale,
    maxScale,
    minViewport,
    maxViewport,
    preserveTransform,
    testTransform = DEFAULT_TEST_TRANSFORM,
  } = options;

  const [needsFallback, setNeedsFallback] = useState(false);
  const [scale, setScale] = useState(maxScale);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const deferSetFallback = () => {
      // Avoid synchronous setState in effect body; defer so React sees it as subscription output.
      enqueueMicrotask(() => setNeedsFallback(true));
    };
    const supportsApi = Boolean(window.CSS?.supports);
    if (!supportsApi) {
      deferSetFallback();
      return;
    }
    const isSupported = window.CSS.supports("transform", testTransform);
    if (!isSupported) {
      deferSetFallback();
    }
  }, [testTransform]);

  useEffect(() => {
    if (!needsFallback || typeof window === "undefined") return;
    const updateScale = () => {
      setScale(
        deriveScale(
          window.innerWidth,
          minViewport,
          maxViewport,
          minScale,
          maxScale,
        ),
      );
    };
    updateScale();
    window.addEventListener("resize", updateScale);
    window.addEventListener("orientationchange", updateScale);
    return () => {
      window.removeEventListener("resize", updateScale);
      window.removeEventListener("orientationchange", updateScale);
    };
  }, [needsFallback, minViewport, maxViewport, minScale, maxScale]);

  const transformStyle = useMemo<React.CSSProperties | undefined>(() => {
    if (!needsFallback) return undefined;
    const prefix = preserveTransform ? `${preserveTransform} ` : "";
    return { transform: `${prefix}scale(${scale})` };
  }, [needsFallback, preserveTransform, scale]);

  return { needsFallback, transformStyle, scale };
}
