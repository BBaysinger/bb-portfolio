"use client";

import { useCallback, useEffect, useState } from "react";

import { getViewportHeightPx } from "@/utils/viewport";

import { useViewportSettle } from "./useViewportSettle";

export interface ViewportSize {
  width: number | null;
  height: number | null;
}

const getViewportSize = (): ViewportSize => {
  if (typeof window === "undefined") {
    return { width: null, height: null };
  }

  const width = Math.round(window.innerWidth || 0);
  const height = getViewportHeightPx();

  return {
    width: width > 0 ? width : null,
    height: height > 0 ? height : null,
  };
};

/**
 * Tracks the current viewport size and refreshes after resize,
 * orientation changes, and post-mount viewport settle passes.
 */
export default function useViewportSize(enabled = true): ViewportSize {
  const [viewportSize, setViewportSize] = useState<ViewportSize>({
    width: null,
    height: null,
  });

  const updateViewportSize = useCallback(() => {
    setViewportSize(getViewportSize());
  }, []);

  useEffect(() => {
    if (!enabled) {
      setViewportSize({ width: null, height: null });
      return;
    }

    updateViewportSize();

    window.addEventListener("resize", updateViewportSize);
    window.addEventListener("orientationchange", updateViewportSize);

    return () => {
      window.removeEventListener("resize", updateViewportSize);
      window.removeEventListener("orientationchange", updateViewportSize);
    };
  }, [enabled, updateViewportSize]);

  useViewportSettle(updateViewportSize, { enabled });

  return viewportSize;
}