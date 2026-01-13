import { useEffect, useRef, RefObject } from "react";

/**
 * Clamped Linear Interpolation (Lerp) Fluid Responsive System - CSS Variables Provider
 *
 * Original concept and implementation by Bradley Baysinger (spawned for this website).
 *
 * Calculates and injects CSS custom properties that act as a normalized viewport lerp (linear interpolation) factor $t$.
 * These variables primarily power the `remRange` SCSS mixin (and any direct CSS that references them).
 *
 * ## System Overview:
 * 1. **useLerpVars** (this hook) - Provides CSS variables like `--lerp-percent-320-640`
 * 2. **remRange mixin** - Uses variables for accessibility-friendly text/UI scaling (rem-based)
 * 3. **lerpRange mixin** - Pure CSS linear interpolation from `100vw` (does not require this hook)
 * 4. **scaleRange mixin** - Transform scaling via a clamp-bounded lerp (linear interpolation)
 *
 * ## How It Works:
 * - JavaScript calculates a normalized lerp (linear interpolation) factor: `(viewport - min) / (max - min)`
 * - Clamps to `[0, 1]` and rounds (currently to 2 decimals)
 * - Sets CSS variables like `--lerp-percent-320-640: 0.75`
 * - SCSS/CSS uses the factor in a lerp (linear interpolation): `value = min + (max - min) * t`
 * - Updates automatically on resize/orientation change
 *
 * Note: If you only use `lerpRange`, you do not need this hook.
 * ## Usage with SCSS Mixins:
 * ```tsx
 * // 1. Set up variables in a layout/root component (AppShell does this in this project)
 * const fluidRanges = [
 *   [320, 640],  // Mobile → tablet
 *   [320, 768],  // Mobile → tablet landscape
 *   [320, 992],  // Mobile → small desktop
 *   [360, 1280], // Mobile+ → desktop
 *   [360, 1440], // Mobile+ → large desktop
 *   [320, 1600], // Mobile → XL desktop
 *   [320, 1792], // Mobile → 16" MacBook Pro
 * ] as const;
 *
 * const fluidRef = useLerpVars(fluidRanges);
 *
 * // Generates (as CSS custom properties on the ref element):
 * // - --lerp-percent-320-640
 * // - --lerp-percent-320-768
 * // - --lerp-percent-320-992
 * // - --lerp-percent-360-1280
 * // - --lerp-percent-360-1440
 * // - --lerp-percent-320-1600
 * // - --lerp-percent-320-1792
 * //
 * // Example values when `window.innerWidth ≈ 992` (clamped to [0,1] and rounded to 2 decimals):
 * // - --lerp-percent-320-640: 1.00
 * // - --lerp-percent-320-768: 1.00
 * // - --lerp-percent-320-992: 1.00
 * // - --lerp-percent-360-1280: 0.69
 * // - --lerp-percent-360-1440: 0.59
 * // - --lerp-percent-320-1600: 0.53
 * // - --lerp-percent-320-1792: 0.46
 *
 * return <div ref={fluidRef}>{children}</div>;
 * ```
 *
 * ```scss
 * // 2. Use in SCSS with mixins
 * .text {
 *   @include remRange(font-size, 16px, 24px, 320, 640);
 * }
 *
 * .container {
 *   @include lerpRange(width, 300px, 800px, 320, 640);
 * }
 * ```
 *
 * ## Direct CSS Usage:
 * ```tsx
 * <div
 *   ref={fluidRef}
 *   style={{
 *     width: "calc(100px + 200px * var(--lerp-percent-320-1280))",
 *     fontSize: "calc(1rem + 0.5rem * var(--lerp-percent-360-1440))"
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
 *   const fluidRef = useLerpVars([
 *     [320, 640],   // Mobile to tablet
 *     [640, 1280],  // Tablet to desktop
 *     [320, 1440]   // Mobile to large desktop
 *   ]);
 *
 *   return (
 *     <div ref={fluidRef}>
 *       // Your responsive content using remRange/lerpRange mixins
 *     </div>
 *   );
 * }
 * ```
 */
export function useLerpVars<T extends HTMLElement = HTMLDivElement>(
  ranges: [number, number][],
): RefObject<T | null> {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    // Calculates and updates all --lerp-percent-[min]-[max] variables
    const update = () => {
      const el = ref.current;
      if (!el) return;

      for (const [min, max] of ranges) {
        const percent = (window.innerWidth - min) / (max - min);
        const clamped = Math.max(0, Math.min(1, percent));
        const rounded = Math.round(clamped * 100) / 100;
        el.style.setProperty(
          `--lerp-percent-${min}-${max}`,
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
