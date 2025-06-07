import { useEffect, useRef } from "react";

export function useElementRelativeMouse(
  containerRef: React.RefObject<HTMLElement>,
) {
  const mousePosRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const updatePos = (e: PointerEvent) => {
      const el = containerRef.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
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
  }, [containerRef]);

  return mousePosRef;
}
