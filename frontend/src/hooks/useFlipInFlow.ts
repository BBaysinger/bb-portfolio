import { gsap } from "gsap";
import { useLayoutEffect } from "react";
import { RefObject } from "react";

/**
 * GSAP transform-based animation hook for smooth in-flow height transitions.
 *
 * Uses ResizeObserver (with a requestAnimationFrame fallback) to detect height
 * changes and animate the target element with a translateY transform to visually
 * smooth out layout shifts. This achieves a lightweight FLIP-style animation
 * without the GSAP Flip plugin.
 *
 * @param watchRef - Ref to the element whose height changes should be observed
 * @param targetRef - Ref to the element that should be animated to smooth the transition
 *
 * @example
 * ```tsx
 * const watchRef = useRef<HTMLElement>(null);
 * const targetRef = useRef<HTMLElement>(null);
 * useFlipInFlow(watchRef, targetRef);
 *
 * return (
 *   <div ref={watchRef}>
 *     <footer ref={targetRef}>...</footer>
 *   </div>
 * );
 * ```
 */
export function useFlipInFlow(
  watchRef: RefObject<HTMLElement | null>,
  targetRef: RefObject<HTMLElement | null>,
) {
  useLayoutEffect(() => {
    const w = watchRef.current;
    const t = targetRef.current;
    if (!w || !t) return;

    let lastRect = w.getBoundingClientRect();
    let isAnimating = false;

    const animate = (rect: DOMRect) => {
      if (isAnimating) return; // prevent flicker from duplicate resize callbacks

      const dh = rect.height - lastRect.height;
      if (Math.abs(dh) < 0.5) return;

      isAnimating = true;

      gsap.set(t, { y: -dh, willChange: "transform" });

      requestAnimationFrame(() => {
        gsap.to(t, {
          y: 0,
          duration: 0.35,
          ease: "power2.out",
          overwrite: "auto",
          onComplete: () => {
            // allow any bounce effects to settle before remeasuring
            requestAnimationFrame(() => {
              lastRect = w.getBoundingClientRect();
              isAnimating = false;
              gsap.set(t, { clearProps: "transform,will-change" });
            });
          },
        });
      });
    };

    const ro = new ResizeObserver(() => {
      const rect = w.getBoundingClientRect();
      animate(rect);
    });

    ro.observe(w);
    return () => ro.disconnect();
  }, [watchRef, targetRef]);
}
