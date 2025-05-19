import { useEffect, useRef, RefObject } from "react";

export function useFluidPercents<T extends HTMLElement = HTMLDivElement>(
  ranges: [number, number][],
): RefObject<T | null> {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const update = () => {
      const el = ref.current;
      if (!el) return;

      for (const [min, max] of ranges) {
        const percent = (window.innerWidth - min) / (max - min);
        const clamped = Math.max(0, Math.min(1, percent));
        el.style.setProperty(`--fluid-percent-${min}-${max}`, clamped.toString());
      }
    };

    update();
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    return () => {
        window.removeEventListener("orientationchange", update);
        window.removeEventListener("resize", update);
    }
  }, [ranges]);

  return ref;
}
