"use client";

import { useEffect } from "react";
import type { RefObject } from "react";

import {
  useStableViewportHeight,
  type UseStableViewportHeightOptions,
} from "./useStableViewportHeight";

export type {
  HeightOnlyResizeContext,
  HeightOnlyResizePolicy,
  UseStableViewportHeightOptions,
} from "./useStableViewportHeight";

export interface UseStableViewportHeightVarOptions extends UseStableViewportHeightOptions {
  cssVarName?: string;
}

/**
 * Convenience wrapper that writes the measured stable viewport height to a CSS
 * custom property on a target element.
 */
export default function useStableViewportHeightVar(
  elementRef: RefObject<HTMLElement | null>,
  options: UseStableViewportHeightVarOptions = {},
) {
  const { cssVarName = "--hero-stable-vh", ...measurementOptions } = options;
  const stableHeightPx = useStableViewportHeight(measurementOptions);

  useEffect(() => {
    const el = elementRef.current;
    if (!el || stableHeightPx === null) return;

    el.style.setProperty(cssVarName, `${stableHeightPx}px`);
  }, [cssVarName, elementRef, stableHeightPx]);
}
