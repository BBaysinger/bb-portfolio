import { useState, useEffect, useRef, useCallback } from "react";

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

interface PointerMeta {
  x: number;
  y: number;
  isPointerDown: boolean;
  isInside: boolean;
  isTouchEvent: boolean;
}

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
 */
interface UseElementRelativePointerOptions extends DebounceMap {
  override?: { x: number; y: number } | undefined;
}

export default function useElementRelativePointer<T extends HTMLElement>(
  targetRef: React.RefObject<T | null>,
  options: UseElementRelativePointerOptions = {},
): PointerMeta {
  const { override, ...debounceMap } = options;

  const [pointerMeta, setPointerMeta] = useState<PointerMeta>({
    x: 0,
    y: 0,
    isPointerDown: false,
    isInside: true,
    isTouchEvent: false,
  });

  const boundingRectRef = useRef<DOMRect | null>(null);
  const debounceRefs = useRef<Partial<Record<MouseEventType, number>>>({});

  const updatePointerMeta = useCallback(
    (type: MouseEventType, e?: PointerEvent) => {
      const rect = boundingRectRef.current;
      if (!rect) return;

      let clientX: number, clientY: number;
      let isTouchEvent = false;

      if (override) {
        clientX = rect.left + override.x;
        clientY = rect.top + override.y;
      } else if (e) {
        clientX = e.clientX;
        clientY = e.clientY;
        isTouchEvent = e.pointerType === "touch";
      } else {
        return;
      }

      const x = clientX - rect.left;
      const y = clientY - rect.top;

      const inside =
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom;

      if (type === "pointerdown") {
        setPointerMeta({
          x,
          y,
          isPointerDown: true,
          isInside: true,
          isTouchEvent,
        });
      } else if (type === "pointermove") {
        setPointerMeta((prev) => ({
          ...prev,
          x,
          y,
          isInside: inside,
          isTouchEvent,
        }));
      } else if (
        type === "pointerup" ||
        type === "pointercancel" ||
        type === "pointerleave"
      ) {
        setPointerMeta((prev) => ({
          ...prev,
          isPointerDown: false,
          isInside: type !== "pointerleave",
          isTouchEvent,
        }));
      }
    },
    [override],
  );

  const trigger = useCallback(
    (type: MouseEventType, e: PointerEvent) => {
      const debounce = debounceMap[type] ?? 0;
      if (debounce === -1) return;

      if (debounce === 0) {
        updatePointerMeta(type, e);
      } else {
        window.clearTimeout(debounceRefs.current[type]);
        debounceRefs.current[type] = window.setTimeout(() => {
          updatePointerMeta(type, e);
        }, debounce);
      }
    },
    [debounceMap, updatePointerMeta],
  );

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
    const currentDebounceRefs = debounceRefs.current; // ⬅️ moved here

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

      Object.values(currentDebounceRefs).forEach((id) =>
        window.clearTimeout(id),
      );
    };
  }, [targetRef, debounceMap, trigger]);

  useEffect(() => {
    if (override) {
      updatePointerMeta("pointermove");
    }
  }, [override, updatePointerMeta]);

  return pointerMeta;
}
