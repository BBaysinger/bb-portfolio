"use client";

import * as React from "react";

export type HoverFocusOptions = {
  /** Enable hover focus (typically only on mouse-primary devices). */
  enabled?: boolean;
  /**
   * Minimum time (ms) the returned `focused` flag remains true after hover ends.
   * This gives the UI time to fade in before fading out.
   */
  minPersistMs?: number;
};

export function useHoverFocus(options: HoverFocusOptions = {}) {
  const enabled = options.enabled ?? true;
  const minPersistMs = options.minPersistMs ?? 400;

  const [focused, setFocused] = React.useState(false);
  const focusedRef = React.useRef(focused);

  const hideTimerRef = React.useRef<number | null>(null);

  const clearHideTimer = React.useCallback(() => {
    if (hideTimerRef.current == null) return;
    window.clearTimeout(hideTimerRef.current);
    hideTimerRef.current = null;
  }, []);

  React.useEffect(() => {
    focusedRef.current = focused;
  }, [focused]);

  React.useEffect(() => {
    if (enabled) return;
    clearHideTimer();
    if (focusedRef.current) {
      focusedRef.current = false;
      setFocused(false);
    }
  }, [clearHideTimer, enabled]);

  const onMouseEnter = React.useCallback(() => {
    if (!enabled) return;
    clearHideTimer();
    if (!focusedRef.current) {
      focusedRef.current = true;
      setFocused(true);
    }
  }, [clearHideTimer, enabled]);

  const onMouseLeave = React.useCallback(() => {
    if (!enabled) return;
    if (!focusedRef.current) return;

    if (minPersistMs <= 0) {
      focusedRef.current = false;
      setFocused(false);
      return;
    }

    clearHideTimer();
    hideTimerRef.current = window.setTimeout(() => {
      hideTimerRef.current = null;
      focusedRef.current = false;
      setFocused(false);
    }, minPersistMs);
  }, [clearHideTimer, enabled, minPersistMs]);

  React.useEffect(() => {
    return () => {
      clearHideTimer();
    };
  }, [clearHideTimer]);

  return {
    focused,
    bind: enabled
      ? ({
          onMouseEnter,
          onMouseLeave,
        } satisfies Pick<
          React.HTMLAttributes<HTMLElement>,
          "onMouseEnter" | "onMouseLeave"
        >)
      : ({} as const),
  };
}
