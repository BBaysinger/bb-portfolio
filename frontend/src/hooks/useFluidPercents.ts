import { useEffect, useRef, RefObject } from "react";

/**
 * Custom hook to calculate and inject CSS custom properties for fluid scaling
 * based on viewport width ranges. These variables can be used in SCSS to drive
 * responsive styles using `calc()` and `--fluid-percent-[min]-[max]`.
 *
 * @param ranges - An array of viewport width ranges [minVw, maxVw] to track.
 * @returns A ref that should be attached to a DOM element where the CSS variables will be applied.
 */
export function useFluidPercents<T extends HTMLElement = HTMLDivElement>(
  ranges: [number, number][],
): RefObject<T | null> {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    // Calculates and updates all --fluid-percent-[min]-[max] variables
    const update = () => {
      const el = ref.current;
      if (!el) return;

      for (const [min, max] of ranges) {
        const percent = (window.innerWidth - min) / (max - min);
        const clamped = Math.max(0, Math.min(1, percent));
        el.style.setProperty(
          `--fluid-percent-${min}-${max}`,
          clamped.toString(),
        );
      }
    };

    // Run immediately on mount
    update();

    // Recalculate on resize and orientation change
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);

    // Clean up event listeners on unmount
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, [ranges]);

  return ref;
}
