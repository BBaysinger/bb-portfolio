"use client";

import { useEffect } from "react";

export type ViewportSettleReason =
  | "raf"
  | "timeout"
  | "pageshow"
  | "visualViewport:resize"
  | "visualViewport:scroll";

export interface ViewportSettleOptions {
  /** Number of requestAnimationFrame passes to run (default: 2). */
  rafPasses?: number;
  /** Additional delayed check after mount (default: 150ms). */
  timeoutMs?: number;
  /** How long to listen to visualViewport events after mount (default: 1000ms). */
  settleMs?: number;
}

const DEFAULT_OPTIONS: Required<ViewportSettleOptions> = {
  rafPasses: 2,
  timeoutMs: 150,
  settleMs: 1000,
};

/**
 * Schedules a few post-mount callbacks to let iOS WebKit viewport metrics settle.
 *
 * This addresses cases where `window.innerHeight` / `visualViewport.height` can be
 * temporarily wrong (often too tall) on initial navigation, then correct shortly after.
 */
export function startViewportSettle(
  onSettle: (reason: ViewportSettleReason) => void,
  options: ViewportSettleOptions = {},
): () => void {
  if (typeof window === "undefined") return () => {};

  const { rafPasses, timeoutMs, settleMs } = { ...DEFAULT_OPTIONS, ...options };

  const rafIds: number[] = [];
  const timeoutIds: number[] = [];

  let active = true;

  const scheduleRafPass = (remaining: number) => {
    if (remaining <= 0) return;
    const id = window.requestAnimationFrame(() => {
      if (!active) return;
      onSettle("raf");
      scheduleRafPass(remaining - 1);
    });
    rafIds.push(id);
  };

  scheduleRafPass(rafPasses);

  if (timeoutMs > 0) {
    timeoutIds.push(
      window.setTimeout(() => active && onSettle("timeout"), timeoutMs),
    );
  }

  const onPageShow = () => {
    if (!active) return;
    onSettle("pageshow");
  };
  window.addEventListener("pageshow", onPageShow);

  const visualViewport = window.visualViewport;

  const onVisualViewportResize = () => {
    if (!active) return;
    onSettle("visualViewport:resize");
  };

  const onVisualViewportScroll = () => {
    if (!active) return;
    onSettle("visualViewport:scroll");
  };

  visualViewport?.addEventListener("resize", onVisualViewportResize, {
    passive: true,
  });
  visualViewport?.addEventListener("scroll", onVisualViewportScroll, {
    passive: true,
  });

  if (settleMs > 0) {
    timeoutIds.push(
      window.setTimeout(() => {
        active = false;
      }, settleMs),
    );
  }

  return () => {
    active = false;

    for (const id of rafIds) window.cancelAnimationFrame(id);
    for (const id of timeoutIds) window.clearTimeout(id);

    window.removeEventListener("pageshow", onPageShow);
    visualViewport?.removeEventListener("resize", onVisualViewportResize);
    visualViewport?.removeEventListener("scroll", onVisualViewportScroll);
  };
}

export function useViewportSettle(
  onSettle: (reason: ViewportSettleReason) => void,
  options: ViewportSettleOptions = {},
) {
  const rafPasses = options.rafPasses ?? DEFAULT_OPTIONS.rafPasses;
  const timeoutMs = options.timeoutMs ?? DEFAULT_OPTIONS.timeoutMs;
  const settleMs = options.settleMs ?? DEFAULT_OPTIONS.settleMs;

  useEffect(
    () =>
      startViewportSettle(onSettle, {
        rafPasses,
        timeoutMs,
        settleMs,
      }),
    [onSettle, rafPasses, timeoutMs, settleMs],
  );
}
