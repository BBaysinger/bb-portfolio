"use client";

import { useEffect, useRef } from "react";

type EventType =
  | "resize"
  | "scroll"
  | "position"
  | "orientationchange"
  | "visibilitychange"
  | "fullscreenchange"
  | "mutate";

type ElementEventType = Extract<EventType, "resize" | "position" | "mutate">;
type WindowEventType = Extract<
  EventType,
  | "resize"
  | "scroll"
  | "orientationchange"
  | "visibilitychange"
  | "fullscreenchange"
>;

/**
 * Optional per-event debounce overrides in milliseconds. Use `0` for immediate
 * delivery, positive numbers to debounce, and `-1` to disable a signal.
 */
type DebounceMap = Partial<Record<EventType, number>>;

/*
 * TODO: Future refinement:
 * 1. Event payload typing is intentionally broad (`Event`), even though
 *    `ResizeObserver` and `MutationObserver` emit different shapes. Consider
 *    renaming the parameter to `payload` or relaxing typing further to avoid
 *    implying native `Event` semantics.
 * 2. The RAF-driven position probe is now opt-in by default (`position: -1`) and
 *    pauses when the page is hidden, but it still runs continuously while
 *    visible. Keep this enabled only where movement tracking is necessary.
 * 3. Consider consolidating shared trigger/observer wiring across the element
 *    hooks to reduce duplication and keep behavior changes centralized.
 * 4. Audit usage to ensure consumers aren't over-subscribing to both element and
 *    window monitors when only one is needed.
 */

const WINDOW_EVENTS: [WindowEventType, string][] = [
  ["resize", "resize"],
  ["scroll", "scroll"],
  ["orientationchange", "orientationchange"],
  ["visibilitychange", "visibilitychange"],
  ["fullscreenchange", "fullscreenchange"],
];

/**
 * Observes element-scoped signals such as `ResizeObserver`, `MutationObserver`,
 * and frame-by-frame position checks, then funnels them into a single debounced
 * callback. Ideal when a component only cares about layout changes triggered by
 * the element itself (size, DOM mutations, movement).
 *
 * @typeParam T - Concrete `Element` subtype stored in {@link targetRef}.
 * @param targetRef - React ref pointing at the element under observation. The
 *   hook is inert until the ref resolves to a truthy element.
 * @param callback - Invoked after the configured debounce delay with the
 *   originating event type (`"resize"`, `"mutate"`, or `"position"`). Receives
 *   the native event when one exists (e.g., mutation records). Callback
 *   identity may change across renders; observers remain stable and always call
 *   the latest callback.
 * @param debounceMap - Optional per-event debounce overrides in milliseconds;
 *   defaults fall back to {@link getDefaultDebounce}. Set `-1` to disable a
 *   particular signal entirely. Debounce settings are read from a ref so
 *   inline object identities do not force observer re-subscription.
 */
export function useElementMonitor<T extends Element>(
  targetRef: React.RefObject<T | null>,
  callback: (eventType: EventType, event?: Event) => void,
  debounceMap: DebounceMap = {},
) {
  const debounceRefs = useRef<Partial<Record<ElementEventType, number>>>({});
  const callbackRef = useRef(callback);
  const debounceMapRef = useRef(debounceMap);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    debounceMapRef.current = debounceMap;
  }, [debounceMap]);

  useEffect(() => {
    const el = targetRef.current;
    if (!el) return;

    const localDebounceRefs = debounceRefs.current;

    const trigger = (type: ElementEventType, event?: Event) => {
      const debounce = debounceMapRef.current[type] ?? getDefaultDebounce(type);
      if (debounce === -1) return;

      if (debounce === 0) {
        callbackRef.current(type, event);
      } else {
        window.clearTimeout(localDebounceRefs[type]);
        localDebounceRefs[type] = window.setTimeout(() => {
          callbackRef.current(type, event);
        }, debounce);
      }
    };

    const observers: (() => void)[] = [];

    if (
      (debounceMapRef.current.resize ?? getDefaultDebounce("resize")) !== -1
    ) {
      const resizeObserver = new ResizeObserver(() => trigger("resize"));
      resizeObserver.observe(el);
      observers.push(() => resizeObserver.disconnect());
    }

    if (
      (debounceMapRef.current.mutate ?? getDefaultDebounce("mutate")) !== -1
    ) {
      const mutationObserver = new MutationObserver(() => trigger("mutate"));
      mutationObserver.observe(el, {
        attributes: true,
        childList: true,
        subtree: true,
      });
      observers.push(() => mutationObserver.disconnect());
    }

    const positionDebounce =
      debounceMapRef.current.position ?? getDefaultDebounce("position");
    if (positionDebounce !== -1) {
      let lastX = 0;
      let lastY = 0;
      let frameId: number | null = null;

      const startPositionLoop = () => {
        if (frameId !== null) return;
        frameId = requestAnimationFrame(checkPosition);
      };

      const stopPositionLoop = () => {
        if (frameId === null) return;
        cancelAnimationFrame(frameId);
        frameId = null;
      };

      const onVisibilityChange = () => {
        if (document.visibilityState === "visible") {
          startPositionLoop();
        } else {
          stopPositionLoop();
        }
      };

      const checkPosition = () => {
        frameId = null;
        const rect = el.getBoundingClientRect();
        if (rect.left !== lastX || rect.top !== lastY) {
          lastX = rect.left;
          lastY = rect.top;
          trigger("position");
        }
        startPositionLoop();
      };

      if (document.visibilityState === "visible") {
        startPositionLoop();
      }

      document.addEventListener("visibilitychange", onVisibilityChange);
      observers.push(() => {
        document.removeEventListener("visibilitychange", onVisibilityChange);
        stopPositionLoop();
      });
    }

    return () => {
      observers.forEach((dispose) => dispose());
      Object.values(localDebounceRefs).forEach((id) => window.clearTimeout(id));
    };
  }, [targetRef]);
}

/**
 * Element monitor variant that takes a concrete element instead of a ref.
 *
 * Useful when you already have an `Element` reference (instead of a React
 * `ref`), e.g. when observing a parent/sibling like `ref.current?.parentElement`.
 * The effect re-binds when the element reference changes.
 *
 * Callback identity may change across renders; observers remain stable and
 * always call the latest callback. Debounce settings are also read from a ref
 * to avoid observer churn when inline maps are used.
 */
export function useElementMonitorElement<T extends Element>(
  target: T | null,
  callback: (eventType: EventType, event?: Event) => void,
  debounceMap: DebounceMap = {},
) {
  const debounceRefs = useRef<Partial<Record<ElementEventType, number>>>({});
  const callbackRef = useRef(callback);
  const debounceMapRef = useRef(debounceMap);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    debounceMapRef.current = debounceMap;
  }, [debounceMap]);

  useEffect(() => {
    const el = target;
    if (!el) return;

    const localDebounceRefs = debounceRefs.current;

    const trigger = (type: ElementEventType, event?: Event) => {
      const debounce = debounceMapRef.current[type] ?? getDefaultDebounce(type);
      if (debounce === -1) return;

      if (debounce === 0) {
        callbackRef.current(type, event);
      } else {
        window.clearTimeout(localDebounceRefs[type]);
        localDebounceRefs[type] = window.setTimeout(() => {
          callbackRef.current(type, event);
        }, debounce);
      }
    };

    const observers: (() => void)[] = [];

    if (
      (debounceMapRef.current.resize ?? getDefaultDebounce("resize")) !== -1
    ) {
      const resizeObserver = new ResizeObserver(() => trigger("resize"));
      resizeObserver.observe(el);
      observers.push(() => resizeObserver.disconnect());
    }

    if (
      (debounceMapRef.current.mutate ?? getDefaultDebounce("mutate")) !== -1
    ) {
      const mutationObserver = new MutationObserver(() => trigger("mutate"));
      mutationObserver.observe(el, {
        attributes: true,
        childList: true,
        subtree: true,
      });
      observers.push(() => mutationObserver.disconnect());
    }

    const positionDebounce =
      debounceMapRef.current.position ?? getDefaultDebounce("position");
    if (positionDebounce !== -1) {
      let lastX = 0;
      let lastY = 0;
      let frameId: number | null = null;

      const startPositionLoop = () => {
        if (frameId !== null) return;
        frameId = requestAnimationFrame(checkPosition);
      };

      const stopPositionLoop = () => {
        if (frameId === null) return;
        cancelAnimationFrame(frameId);
        frameId = null;
      };

      const onVisibilityChange = () => {
        if (document.visibilityState === "visible") {
          startPositionLoop();
        } else {
          stopPositionLoop();
        }
      };

      const checkPosition = () => {
        frameId = null;
        const rect = el.getBoundingClientRect();
        if (rect.left !== lastX || rect.top !== lastY) {
          lastX = rect.left;
          lastY = rect.top;
          trigger("position");
        }
        startPositionLoop();
      };

      if (document.visibilityState === "visible") {
        startPositionLoop();
      }

      document.addEventListener("visibilitychange", onVisibilityChange);
      observers.push(() => {
        document.removeEventListener("visibilitychange", onVisibilityChange);
        stopPositionLoop();
      });
    }

    return () => {
      observers.forEach((dispose) => dispose());
      Object.values(localDebounceRefs).forEach((id) => window.clearTimeout(id));
    };
  }, [target]);
}

/**
 * Listens for global window-level events (`scroll`, `orientationchange`,
 * `visibilitychange`, `fullscreenchange`) that may indirectly influence an
 * element's layout, and debounces them through the supplied callback.
 *
 * @typeParam T - Concrete `Element` subtype stored in {@link targetRef}. The
 *   hook remains inert until the ref resolves; this keeps React Hooks rules
 *   satisfied while avoiding unnecessary listeners for unmounted targets.
 * @param targetRef - React ref for the element whose layout depends on the
 *   global signals. Used only as a lifecycle anchor.
 * @param callback - Receives the originating window event type plus the native
 *   `Event` object after the debounce interval elapses. Callback identity may
 *   change across renders; listeners remain stable and always call the latest
 *   callback.
 * @param debounceMap - Optional debounce overrides mirroring
 *   {@link useElementMonitor}. Pass `-1` to opt out of any window event.
 *   Debounce settings are read from a ref so inline object identities do not
 *   force listener re-subscription.
 */
export function useWindowMonitor<T extends Element>(
  targetRef: React.RefObject<T | null>,
  callback: (eventType: EventType, event?: Event) => void,
  debounceMap: DebounceMap = {},
) {
  const debounceRefs = useRef<Partial<Record<WindowEventType, number>>>({});
  const callbackRef = useRef(callback);
  const debounceMapRef = useRef(debounceMap);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    debounceMapRef.current = debounceMap;
  }, [debounceMap]);

  useEffect(() => {
    const el = targetRef.current;
    if (!el) return;

    const localDebounceRefs = debounceRefs.current;

    const trigger = (type: WindowEventType, event?: Event) => {
      const debounce = debounceMapRef.current[type] ?? getDefaultDebounce(type);
      if (debounce === -1) return;

      if (debounce === 0) {
        callbackRef.current(type, event);
      } else {
        window.clearTimeout(localDebounceRefs[type]);
        localDebounceRefs[type] = window.setTimeout(() => {
          callbackRef.current(type, event);
        }, debounce);
      }
    };

    const disposers: (() => void)[] = [];

    for (const [type, eventName] of WINDOW_EVENTS) {
      const handler = (e: Event) => trigger(type, e);
      window.addEventListener(eventName, handler, { passive: true });
      disposers.push(() => window.removeEventListener(eventName, handler));
    }

    return () => {
      disposers.forEach((dispose) => dispose());
      Object.values(localDebounceRefs).forEach((id) => window.clearTimeout(id));
    };
  }, [targetRef]);
}

/**
 * Convenience hook that composes {@link useElementMonitor} and
 * {@link useWindowMonitor} so consumers can subscribe to "anything that moves
 * this element" through a single API. Useful for complex UI widgets that must
 * react to both local DOM changes and viewport-wide shifts.
 *
 * @typeParam T - Concrete `Element` subtype stored in {@link targetRef}.
 * @param targetRef - React ref for the element whose layout should be tracked.
 * @param callback - Invoked with every debounced `EventType`, regardless of the
 *   originating source (element observer vs. window event).
 * @param debounceMap - Shared debounce overrides forwarded to both underlying
 *   hooks. Define event-specific values to fine-tune responsiveness.
 */
export function useLayoutMonitor<T extends Element>(
  targetRef: React.RefObject<T | null>,
  callback: (eventType: EventType, event?: Event) => void,
  debounceMap: DebounceMap = {},
) {
  useElementMonitor(targetRef, callback, debounceMap);
  useWindowMonitor(targetRef, callback, debounceMap);
}

/**
 * Provides sensible debounce defaults (in milliseconds) for each event type so
 * consumers can omit configuration for common cases.
 */
function getDefaultDebounce(type: EventType): number {
  switch (type) {
    case "resize":
    case "orientationchange":
    case "mutate":
      return 50;
    case "position":
      // Position checks use RAF polling; keep this opt-in by default.
      return -1;
    case "scroll":
    case "visibilitychange":
    case "fullscreenchange":
      return 10;
    default:
      return 0;
  }
}

export default useLayoutMonitor;
