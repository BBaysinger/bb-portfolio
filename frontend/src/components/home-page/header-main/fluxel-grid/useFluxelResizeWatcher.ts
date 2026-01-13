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

    let retryFrameId: number | null = null;
    let handlerFrameId: number | null = null;
    let timeoutId: number | null = null;
    let observer: ResizeObserver | null = null;

    const runHandler = () => {
      handlerFrameId = null;
      handlerRef.current();
    };

    const schedule = () => {
      resizeStartRef.current?.();

      if (debounceMs > 0) {
        // Debounced mode: cancel any already-scheduled handler run so we don't
        // execute intermediate sizes while the user is still resizing.
        if (handlerFrameId !== null) {
          window.cancelAnimationFrame(handlerFrameId);
          handlerFrameId = null;
        }
        if (timeoutId !== null) {
          window.clearTimeout(timeoutId);
        }
        timeoutId = window.setTimeout(() => {
          timeoutId = null;
          handlerFrameId = window.requestAnimationFrame(runHandler);
        }, debounceMs);
        return;
      }

      // Non-debounced mode: batch multiple ResizeObserver callbacks into a
      // single handler run per animation frame.
      if (handlerFrameId === null) {
        handlerFrameId = window.requestAnimationFrame(runHandler);
      }
    };

    // Allow passing a getter function so callers can reference elements that
    // may not exist on the first render.
    const resolveTarget = () =>
      typeof target === "function" ? target() : target;

    const attach = (el: HTMLElement) => {
      observer = new ResizeObserver(schedule);
      observer.observe(el);
    };

    const initial = resolveTarget();
    if (initial) {
      attach(initial);
    } else {
      // Retry attachment until the target element exists (common when the DOM
      // node is created by a child renderer and isn't available on first render).
      const tick = () => {
        const resolved = resolveTarget();
        if (resolved) {
          attach(resolved);
          retryFrameId = null;
          return;
        }
        retryFrameId = window.requestAnimationFrame(tick);
      };
      retryFrameId = window.requestAnimationFrame(tick);
    }

    return () => {
      if (retryFrameId !== null) {
        window.cancelAnimationFrame(retryFrameId);
      }
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
      if (handlerFrameId !== null) {
        window.cancelAnimationFrame(handlerFrameId);
      }
      if (observer) {
        observer.disconnect();
      }
      observer = null;
      retryFrameId = null;
      timeoutId = null;
      handlerFrameId = null;
    };
  }, [target, debounceMs]);
}
