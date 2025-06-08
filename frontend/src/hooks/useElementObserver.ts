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
 * A comprehensive debounced layout change observer that listens for
 * every way an element can change — with optional exclusions.
 *
 * Takes the pain out of watching an element and having to
 * remember all the possible ways it can change.
 *
 * @param targetRef The element to observe (for resize and mutation).
 * @param callback The callback to run when any observed change happens.
 * @param debounceMap Object describing debounce values per event type:
 * - -1 = ignore event entirely
 * - 0  = no debounce
 * - n  = debounce by `n` milliseconds
 *
 * @author Bradley Baysinger
 * @since The beginning of time.
 */
export function useElementObserver<T extends Element>(
  targetRef: React.RefObject<T | null>,
  callback: (eventType: EventType, event?: Event) => void,
  debounceMap: DebounceMap = {},
) {
  const debounceRefs = useRef<Partial<Record<EventType, number>>>({});

  const trigger = (type: EventType, event?: Event) => {
    const debounce = debounceMap[type] ?? getDefaultDebounce(type);
    if (debounce === -1) return;

    if (debounce === 0) {
      callback(type, event);
    } else {
      window.clearTimeout(debounceRefs.current[type]);
      debounceRefs.current[type] = window.setTimeout(() => {
        callback(type, event);
      }, debounce);
    }
  };

  useEffect(() => {
    const el = targetRef.current;
    if (!el) return;

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

    // Other window events
    const events: [EventType, string][] = [
      ["scroll", "scroll"],
      ["orientationchange", "orientationchange"],
      ["visibilitychange", "visibilitychange"],
      ["fullscreenchange", "fullscreenchange"],
      ["position", "resize"], // alias: uses resize event
    ];

    for (const [type, eventName] of events) {
      if ((debounceMap[type] ?? getDefaultDebounce(type)) === -1) continue;

      const handler = (e: Event) => trigger(type, e);
      window.addEventListener(eventName, handler, { passive: true });
      observers.push(() => window.removeEventListener(eventName, handler));
    }

    return () => {
      observers.forEach((dispose) => dispose());
      Object.values(debounceRefs.current).forEach((id) =>
        window.clearTimeout(id),
      );
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
