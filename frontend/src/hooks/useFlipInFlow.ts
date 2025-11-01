import { gsap } from "gsap";
import { useLayoutEffect } from "react";
import { RefObject } from "react";

/**
 * GSAP transform-based animation hook for smooth in-flow height transitions.
 *
 * Currently monitors layout changes via a requestAnimationFrame polling loop and
 * animates the target element with a simple translateY to compensate for the
 * watched element's height delta. Useful for in-flow UI (e.g., a footer) that
 * needs to visually “stick” as nearby content grows/shrinks.
 *
 * NOTE:
 * - This implementation does not yet use GSAP's Flip plugin; it's a lightweight
 *   transform animation only. TODO: Consider GSAP Flip as an option.
 * - It does not use ResizeObserver yet.
 *   TODO: Replace RAF polling with ResizeObserver for efficiency and event-driven updates.
 *   Optionally consider GSAP Flip for full FLIP semantics if position changes (not just height) must be animated.
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
    if (typeof window === "undefined") return;

    const w = watchRef.current;
    const t = targetRef.current;
    if (!w || !t) return;

    let lastRect = w.getBoundingClientRect();
    let rafId: number;

    // TODO: Replace RAF-driven checks with ResizeObserver to avoid continuous polling
    // and trigger animations only when element size actually changes.
    const check = () => {
      const rect = w.getBoundingClientRect();
      const dh = rect.height - lastRect.height;

      // Detect height change only (position/top deltas are not handled here)
      // TODO: If vertical position changes should be animated too, compute delta of `rect.top`
      // and incorporate it into the transform.
      if (Math.abs(dh) > 0.1) {
        // console.info("FLIP Invert", { dh }, t);

        gsap.set(t, { y: -dh, willChange: "transform" });

        gsap.to(t, {
          duration: 0.35,
          y: 0,
          ease: "power2.out",
          clearProps: "transform,will-change",
        });

        lastRect = rect;
      }

      rafId = requestAnimationFrame(check);
    };

    rafId = requestAnimationFrame(check);

    return () => cancelAnimationFrame(rafId);
  }, []); // Run once per mount
}
