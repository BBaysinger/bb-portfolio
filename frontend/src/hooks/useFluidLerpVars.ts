import { useEffect, useRef, RefObject } from "react";

/**
 * Fluid Responsive System - CSS Variables Provider
 *
 * Original concept and implementation by Bradley Baysinger (spawned for this website).
 *
 * Calculates and injects CSS custom properties that act as a normalized viewport lerp (linear interpolation) factor $t$.
 * These variables primarily power the remRange SCSS mixin (and any direct CSS that references them).
 *
 * ## System Overview:
 * 1. **useFluidLerpVars** (this hook) - Provides CSS variables like `--fluid-percent-320-680`
 * 2. **remRange mixin** - Uses variables for accessibility-friendly text/UI scaling (rem-based)
 * 3. **staticRange mixin** - Pure CSS linear interpolation from `100vw` (does not require this hook)
 * 4. **scaleRange mixin** - Transform scaling via a clamp-bounded lerp (linear interpolation)
 *
 * ## How It Works:
 * - JavaScript calculates a normalized lerp (linear interpolation) factor: `(viewport - min) / (max - min)`
 * - Clamps to `[0, 1]` and rounds (currently to 2 decimals)
 * - Sets CSS variables like `--fluid-percent-320-680: 0.75`
 * - SCSS/CSS uses the factor in a lerp (linear interpolation): `value = min + (max - min) * t`
 * - Updates automatically on resize/orientation change
 *
 * Note: If you only use `staticRange`, you do not need this hook.
 *
 * ## Usage with SCSS Mixins:
 * ```tsx
 * // 1. Set up variables in layout component
 * const fluidRef = useFluidLerpVars([
 *   [320, 680],  // Creates --fluid-percent-320-680
 *   [360, 1440], // Creates --fluid-percent-360-1440
 * ]);
 *
 * return <div ref={fluidRef}>{children}</div>;
 * ```
 *
 * ```scss
 * // 2. Use in SCSS with mixins
 * .text {
 *   @include remRange(font-size, 16px, 24px, 320, 680);
 * }
 *
 * .container {
 *   @include staticRange(width, 300px, 800px, 320, 680);
 * }
 * ```
 *
 * ## Direct CSS Usage:
 * ```tsx
 * <div
 *   ref={fluidRef}
 *   style={{
 *     width: "calc(100px + 200px * var(--fluid-percent-320-1280))",
 *     fontSize: "calc(1rem + 0.5rem * var(--fluid-percent-360-1440))"
 *   }}
 * />
 * ```
 *
 * @param ranges - Viewport width ranges to track as [minVw, maxVw] pairs
 * @returns Ref to attach to DOM element where CSS variables will be applied
 *
 * @example
 * ```tsx
 * function App() {
 *   const fluidRef = useFluidLerpVars([
 *     [320, 680],   // Mobile to tablet
 *     [680, 1280],  // Tablet to desktop
 *     [320, 1440]   // Mobile to large desktop
 *   ]);
 *
 *   return (
 *     <div ref={fluidRef}>
 *       // Your responsive content using remRange/staticRange mixins
 *     </div>
 *   );
 * }
 * ```
 */
export function useFluidLerpVars<T extends HTMLElement = HTMLDivElement>(
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
        const rounded = Math.round(clamped * 100) / 100;
        el.style.setProperty(
          `--fluid-percent-${min}-${max}`,
          rounded.toString(),
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
