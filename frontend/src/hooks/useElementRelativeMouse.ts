import { useEffect, useRef, useCallback } from "react";
import { useDebouncedResizeObserver } from "./useDebouncedResizeObserver";

/**
 *
 *
 * @author Bradley Baysinger
 * @since The beginning of time.
 * @version N/A
 */
export function useElementRelativeMouse(
  containerRef: React.RefObject<HTMLElement | null>,
) {
  const mousePosRef = useRef<{ x: number; y: number } | null>(null);
  const rectRef = useRef<DOMRect | null>(null);

  const updateRect = useCallback(() => {
    const el = containerRef.current;
    if (el) rectRef.current = el.getBoundingClientRect();
  }, [containerRef]);

  // Resize observer for container size changes
  useDebouncedResizeObserver(containerRef, updateRect, 50);

  useEffect(() => {
    updateRect(); // initial update

    // Also update rect on window scroll and resize
    window.addEventListener("scroll", updateRect, true); // true = capture phase
    window.addEventListener("resize", updateRect);

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
      window.removeEventListener("scroll", updateRect, true);
      window.removeEventListener("resize", updateRect);
    };
  }, [updateRect]);

  return mousePosRef;
}
