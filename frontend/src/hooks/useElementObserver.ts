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

type DebounceMap = Partial<Record<EventType, number>>;

/**
 * Subscribes to a broad set of layout-affecting signals for a given element and
 * funnels them through a single debounced callback. Each event type can be
 * tuned (or disabled) via {@link debounceMap}, letting consumers decide how
 * aggressively to react to changes such as `resize`, `scroll`, DOM mutations, or
 * orientation flips.
 *
 * @typeParam T - Concrete HTMLElement subtype stored in {@link targetRef}.
 * @param targetRef - React ref for the element to observe. Hook is inert until
 *   a truthy element exists.
 * @param callback - Invoked with the originating {@link EventType} plus the
 *   native event (when available) after the configured debounce delay.
 * @param debounceMap - Optional per-event debounce overrides in milliseconds;
 *   `0` triggers immediately, positive numbers debounce, and `-1` disables that
 *   signal entirely. Missing keys fall back to sensible defaults.
 */
export function useElementObserver<T extends Element>(
  targetRef: React.RefObject<T | null>,
  callback: (eventType: EventType, event?: Event) => void,
  debounceMap: DebounceMap = {},
) {
  const debounceRefs = useRef<Partial<Record<EventType, number>>>({});

  useEffect(() => {
    const el = targetRef.current;
    if (!el) return;

    const localDebounceRefs = debounceRefs.current;

    const trigger = (type: EventType, event?: Event) => {
      const debounce = debounceMap[type] ?? getDefaultDebounce(type);
      if (debounce === -1) return;

      if (debounce === 0) {
        callback(type, event);
      } else {
        window.clearTimeout(localDebounceRefs[type]);
        localDebounceRefs[type] = window.setTimeout(() => {
          callback(type, event);
        }, debounce);
      }
    };

    const observers: (() => void)[] = [];

    // ResizeObserver
    if ((debounceMap.resize ?? getDefaultDebounce("resize")) !== -1) {
      const resizeObserver = new ResizeObserver(() => trigger("resize"));
      resizeObserver.observe(el);
      observers.push(() => resizeObserver.disconnect());
    }

    // MutationObserver
    if ((debounceMap.mutate ?? getDefaultDebounce("mutate")) !== -1) {
      const mutationObserver = new MutationObserver(() => trigger("mutate"));
      mutationObserver.observe(el, {
        attributes: true,
        childList: true,
        subtree: true,
      });
      observers.push(() => mutationObserver.disconnect());
    }

    // Poll position (only if enabled)
    const positionDebounce =
      debounceMap.position ?? getDefaultDebounce("position");
    if (positionDebounce !== -1) {
      let lastX = 0;
      let lastY = 0;
      let frameId: number;

      const checkPosition = () => {
        const rect = el.getBoundingClientRect();
        if (rect.left !== lastX || rect.top !== lastY) {
          lastX = rect.left;
          lastY = rect.top;
          trigger("position");
        }
        frameId = requestAnimationFrame(checkPosition);
      };

      frameId = requestAnimationFrame(checkPosition);
      observers.push(() => cancelAnimationFrame(frameId));
    }

    // Window events
    const events: [EventType, string][] = [
      ["scroll", "scroll"],
      ["orientationchange", "orientationchange"],
      ["visibilitychange", "visibilitychange"],
      ["fullscreenchange", "fullscreenchange"],
    ];

    for (const [type, eventName] of events) {
      if ((debounceMap[type] ?? getDefaultDebounce(type)) === -1) continue;

      const handler = (e: Event) => trigger(type, e);
      window.addEventListener(eventName, handler, { passive: true });
      observers.push(() => window.removeEventListener(eventName, handler));
    }

    return () => {
      observers.forEach((dispose) => dispose());
      Object.values(localDebounceRefs).forEach((id) => window.clearTimeout(id));
    };
  }, [targetRef, callback, debounceMap]);
}

function getDefaultDebounce(type: EventType): number {
  switch (type) {
    case "resize":
    case "position":
    case "orientationchange":
    case "mutate":
      return 50;
    case "scroll":
    case "visibilitychange":
    case "fullscreenchange":
      return 10;
    default:
      return 0;
  }
}

export default useElementObserver;
