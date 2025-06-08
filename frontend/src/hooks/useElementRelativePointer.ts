import { useState, useEffect, useRef } from "react";
import { useElementObserver } from "./useElementObserver";

export type MouseEventType =
  | "pointerdown"
  | "pointermove"
  | "pointerup"
  | "pointercancel"
  | "pointerleave";

export type LayoutEventType =
  | "resize"
  | "scroll"
  | "orientationchange"
  | "visibilitychange"
  | "fullscreenchange"
  | "mutate";

export type CombinedEventType = MouseEventType | LayoutEventType;

export type DebounceMap = Partial<Record<CombinedEventType, number>>;

/**
 * Tracks pointer position relative to a target DOM element.
 *
 * This hook monitors pointer events globally and calculates the position
 * of the pointer relative to the provided `targetRef` element. It only
 * updates when a pointer is actively started/moved, and resets when released,
 * canceled, or leaves the window. Useful for drag-like interactions.
 *
 * Additionally, it recalculates the element's bounding rect on layout-affecting
 * changes using `useElementObserver`, supporting events such as:
 * - resize
 * - scroll
 * - orientationchange
 * - visibilitychange
 * - fullscreenchange
 * - DOM mutations
 *
 * Debounce behavior for each event type can be customized. Use `-1` to disable
 * any specific event, `0` for no debounce, or a positive number for debounce in ms.
 *
 * @example
 * ```tsx
 * const boxRef = useRef<HTMLDivElement | null>(null);
 * const pos = useElementRelativePointer(boxRef);
 *
 * return (
 *   <div ref={boxRef} style={{ width: 300, height: 300, background: "#222" }}>
 *     {pos && (
 *       <div style={{ position: "absolute", left: pos.x, top: pos.y }}>
 *         Pointer is here
 *       </div>
 *     )}
 *   </div>
 * );
 * ```
 *
 * @param targetRef The element to track relative pointer position against.
 * @param debounceMap Optional map of debounce durations per event type.
 * @returns `{ x, y }` coordinates relative to the element, or `null` when inactive.
 *
 * @author Bradley Baysinger
 * @since The beginning of time.
 */
export default function useElementRelativePointer<T extends HTMLElement>(
  targetRef: React.RefObject<T | null>,
  debounceMap: DebounceMap = {
    resize: 20,
    scroll: 20,
    orientationchange: 0,
    visibilitychange: 0,
    fullscreenchange: 0,
    mutate: 100,
    pointermove: 0,
    pointerdown: 0,
    pointerup: 0,
    pointercancel: 0,
    pointerleave: 0,
  },
): { x: number; y: number } | null {
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(
    null,
  );
  const boundingRectRef = useRef<DOMRect | null>(null);
  const isPointerDownRef = useRef(false);
  const debounceRefs = useRef<Partial<Record<MouseEventType, number>>>({});

  const trigger = (type: MouseEventType, e: PointerEvent) => {
    const debounce = debounceMap[type] ?? 0;
    if (debounce === -1) return;

    if (debounce === 0) {
      updateMousePos(type, e);
    } else {
      window.clearTimeout(debounceRefs.current[type]);
      debounceRefs.current[type] = window.setTimeout(() => {
        updateMousePos(type, e);
      }, debounce);
    }
  };

  const updateMousePos = (type: MouseEventType, e: PointerEvent) => {
    const rect = boundingRectRef.current;
    if (!rect) return;

    if (type === "pointerdown") {
      isPointerDownRef.current = true;
      setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    } else if (type === "pointermove") {
      if (!isPointerDownRef.current) return;
      setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    } else if (
      type === "pointerup" ||
      type === "pointercancel" ||
      type === "pointerleave"
    ) {
      isPointerDownRef.current = false;
      setMousePos(null);
    }
  };

  // Recalculate bounding rect on layout-affecting events
  useElementObserver(
    targetRef,
    () => {
      const el = targetRef.current;
      if (el) boundingRectRef.current = el.getBoundingClientRect();
    },
    debounceMap,
  );

  useEffect(() => {
    const el = targetRef.current;
    if (!el) return;

    boundingRectRef.current = el.getBoundingClientRect();

    const events: MouseEventType[] = [
      "pointerdown",
      "pointermove",
      "pointerup",
      "pointercancel",
      "pointerleave",
    ];

    const handlers: Partial<Record<MouseEventType, (e: PointerEvent) => void>> =
      {};

    for (const type of events) {
      const debounce = debounceMap[type];
      if (debounce === -1) continue;
      handlers[type] = (e: PointerEvent) => trigger(type, e);
      window.addEventListener(type, handlers[type]!, { passive: true });
    }

    return () => {
      for (const type of events) {
        if (handlers[type]) {
          window.removeEventListener(type, handlers[type]!);
        }
      }
      Object.values(debounceRefs.current).forEach((id) =>
        window.clearTimeout(id),
      );
    };
  }, [targetRef, debounceMap]);

  return mousePos;
}
