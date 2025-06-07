import { useEffect, useRef, useCallback, useState } from "react";
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
): { x: number; y: number } | null {
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(
    null,
  );
  const rectRef = useRef<DOMRect | null>(null);

  const updateRect = useCallback(() => {
    console.log("Updating element rect");
    const el = containerRef.current;
    if (el) rectRef.current = el.getBoundingClientRect();
  }, [containerRef]);

  useDebouncedResizeObserver(containerRef, updateRect, 50);

  useEffect(() => {
    updateRect();

    window.addEventListener("scroll", updateRect, true);
    window.addEventListener("resize", updateRect);
    window.addEventListener("orientationchange", updateRect);

    const onPointerMove = (e: PointerEvent) => {
      const el = containerRef.current;
      const rect = rectRef.current;
      if (!el || !rect) return;

      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      setMousePos({ x, y });
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerdown", onPointerMove);
    window.addEventListener("pointerup", onPointerMove);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerdown", onPointerMove);
      window.removeEventListener("pointerup", onPointerMove);
      window.removeEventListener("scroll", updateRect, true);
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("orientationchange", updateRect);
    };
  }, [containerRef, updateRect]);

  return mousePos;
}
