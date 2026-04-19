"use client";

import { useSyncExternalStore } from "react";

import { getViewportHeightPx } from "@/utils/viewport";

import { startViewportSettle } from "./useViewportSettle";

export interface ViewportSize {
  width: number | null;
  height: number | null;
}

const NULL_VIEWPORT_SIZE: ViewportSize = {
  width: null,
  height: null,
};

let cachedViewportSize: ViewportSize = NULL_VIEWPORT_SIZE;

const measureViewportSize = (): ViewportSize => {
  if (typeof window === "undefined") {
    return NULL_VIEWPORT_SIZE;
  }

  const width = Math.round(window.innerWidth || 0);
  const height = getViewportHeightPx();

  return {
    width: width > 0 ? width : null,
    height: height > 0 ? height : null,
  };
};

const getViewportSize = (): ViewportSize => {
  const nextViewportSize = measureViewportSize();

  if (
    cachedViewportSize.width === nextViewportSize.width &&
    cachedViewportSize.height === nextViewportSize.height
  ) {
    return cachedViewportSize;
  }

  cachedViewportSize = nextViewportSize;
  return cachedViewportSize;
};

const subscribeToViewportSize = (onStoreChange: () => void) => {
  if (typeof window === "undefined") return () => {};

  const handleViewportChange = () => {
    onStoreChange();
  };

  window.addEventListener("resize", handleViewportChange);
  window.addEventListener("orientationchange", handleViewportChange);

  const stopViewportSettle = startViewportSettle(() => {
    handleViewportChange();
  });

  return () => {
    stopViewportSettle();
    window.removeEventListener("resize", handleViewportChange);
    window.removeEventListener("orientationchange", handleViewportChange);
  };
};

/**
 * Tracks the current viewport size and refreshes after resize,
 * orientation changes, and post-mount viewport settle passes.
 */
export default function useViewportSize(enabled = true): ViewportSize {
  const viewportSize = useSyncExternalStore(
    enabled ? subscribeToViewportSize : () => () => {},
    enabled ? getViewportSize : () => NULL_VIEWPORT_SIZE,
    () => NULL_VIEWPORT_SIZE,
  );

  return viewportSize;
}
