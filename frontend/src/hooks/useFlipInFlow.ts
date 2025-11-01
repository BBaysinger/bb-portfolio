import { gsap } from "gsap";
import { useLayoutEffect } from "react";
import { RefObject } from "react";

/**
 * GSAP Flip-based animation hook for smooth layout transitions.
 *
 * Monitors layout changes using ResizeObserver and applies GSAP Flip animations
 * to create smooth transitions when elements change position or size. This is
 * particularly useful for footer positioning that needs to adapt to dynamic
 * content height changes.
 *
 * @param footerRef - React ref to the element that should be animated during layout changes
 * @param deps - Optional dependency array to control when the effect should re-run
 *
 * @example
 * ```tsx
 * const footerRef = useRef<HTMLElement>(null);
 * useFlipInFlow(footerRef, [someState]);
 *
 * return <footer ref={footerRef}>...</footer>
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

    const check = () => {
      const rect = w.getBoundingClientRect();
      const dh = rect.height - lastRect.height;

      // Detect vertical motion OR height change
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
