/**
 * Shared ResizeObserver wrapper for fluxel grids.
 * Keeps layout sync logic consistent between SVG and Pixi renderers
 * while allowing each implementation to specify debouncing semantics.
 */

import { useEffect, useRef } from "react";

export type FluxelResizeOptions = {
  debounceMs?: number;
  onResizeStart?: () => void;
};

export type FluxelResizeTarget =
  | HTMLElement
  | null
  | (() => HTMLElement | null);

/**
 * Observes size changes on the provided element and invokes the handler.
 * Optional debounce keeps expensive resize flows (Pixi) from thrashing.
 */
export function useFluxelResizeWatcher(
  target: FluxelResizeTarget,
  handler: () => void,
  options?: FluxelResizeOptions,
) {
  const handlerRef = useRef(handler);
  const resizeStartRef = useRef(options?.onResizeStart);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    resizeStartRef.current = options?.onResizeStart;
  }, [options?.onResizeStart]);

  const debounceMs = options?.debounceMs ?? 0;

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      typeof ResizeObserver === "undefined"
    ) {
      return;
    }

    const element =
      typeof target === "function" ? target() : (target as HTMLElement | null);
    if (!element) {
      return;
    }

    let rafId: number | null = null;
    let timeoutId: number | null = null;

    const runHandler = () => {
      rafId = null;
      handlerRef.current();
    };

    const schedule = () => {
      resizeStartRef.current?.();
      if (debounceMs > 0) {
        if (timeoutId !== null) {
          window.clearTimeout(timeoutId);
        }
        timeoutId = window.setTimeout(() => {
          timeoutId = null;
          rafId = window.requestAnimationFrame(runHandler);
        }, debounceMs);
      } else if (rafId === null) {
        rafId = window.requestAnimationFrame(runHandler);
      }
    };

    const observer = new ResizeObserver(schedule);
    observer.observe(element);

    return () => {
      observer.disconnect();
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, [target, debounceMs]);
}
