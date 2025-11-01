import { gsap } from "gsap";
import { Flip } from "gsap/Flip";
import { useLayoutEffect } from "react";
import { RefObject, DependencyList } from "react";

// Register the Flip plugin
gsap.registerPlugin(Flip);

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
  footerRef: RefObject<HTMLElement | null>,
  deps: DependencyList = [],
) {
  useLayoutEffect(() => {
    if (!footerRef.current) return;

    // Check if GSAP is properly loaded
    if (typeof Flip === "undefined" || !Flip.getState) {
      console.warn("GSAP Flip plugin not properly loaded");
      return;
    }

    const observer = new ResizeObserver(() => {
      try {
        if (!footerRef.current) return;

        const state = Flip.getState(footerRef.current);
        requestAnimationFrame(() => {
          Flip.from(state, { duration: 0.4, ease: "power1.out" });
        });
      } catch (error) {
        console.warn("Flip animation error:", error);
      }
    });

    observer.observe(document.body);
    return () => observer.disconnect();
  }, deps);
}
