import { useEffect, useRef, useCallback } from "react";
import { useDebouncedResizeObserver } from "./useDebouncedResizeObserver";

export function useElementRelativeMouse(
  containerRef: React.RefObject<HTMLElement>,
) {
  const mousePosRef = useRef<{ x: number; y: number } | null>(null);
  const rectRef = useRef<DOMRect | null>(null);

  // Update bounding rect with debounced observer
  const updateRect = useCallback(() => {
    const el = containerRef.current;
    if (el) rectRef.current = el.getBoundingClientRect();
  }, [containerRef]);

  useDebouncedResizeObserver(containerRef, updateRect, 50);

  useEffect(() => {
    updateRect(); // initial call in case resize hasn’t triggered yet

    const updatePos = (e: PointerEvent) => {
      const rect = rectRef.current;
      if (!rect) return;

      mousePosRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    };

    window.addEventListener("pointermove", updatePos);
    window.addEventListener("pointerdown", updatePos);
    window.addEventListener("pointerup", updatePos);

    return () => {
      window.removeEventListener("pointermove", updatePos);
      window.removeEventListener("pointerdown", updatePos);
      window.removeEventListener("pointerup", updatePos);
    };
  }, [updateRect]);

  return mousePosRef;
}
