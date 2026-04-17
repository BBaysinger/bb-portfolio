import { useEffect, useState } from "react";

/**
 * useActivePointerType
 *
 * Tracks the most recently used pointer input type: `"mouse"`, `"touch"`, or `"pen"`.
 *
 * 🔍 Strategy:
 * - On first render, it attempts to **guess** the current input type using CSS media queries:
 *     - `(pointer: fine)` typically indicates mouse or trackpad.
 *     - `(pointer: coarse)` typically indicates touch input.
 * - This guess is used as the initial state so you can conditionally load mouse-only logic
 *   (like GSAP Draggable) without blocking render or user interaction.
 * - After mount, it **listens for real `pointerdown` events** and updates the state to reflect
 *   the most recently used pointer type.
 *
 * ✅ Benefits:
 * - Enables dynamic handling of hybrid environments (e.g. touchscreen laptops, iPads with mice).
 * - Prevents performance and UX issues by avoiding premature attachment of mouse-only listeners.
 * - Plays nice with iOS Safari by letting native scroll/momentum/swipe work unless a real mouse is in use.
 *
 * ⚠ Limitations:
 * - The initial guess may be incorrect on hybrid or obscure devices.
 * - You should still check explicitly for `"mouse"` before initializing mouse-specific behaviors.
 *
 * Example usage:
 * ```ts
 * const pointerType = useActivePointerType();
 * if (pointerType === "mouse") {
 *   enableMouseOnlyFeature();
 * }
 * ```
 *
 * @returns `"mouse"`, `"touch"`, `"pen"`, or `null` if no input has been detected and media queries failed.
 *
 */
export function useActivePointerType(): "mouse" | "touch" | "pen" | null {
  const getInitialPointerType = (): "mouse" | "touch" | "pen" | null => {
    if (
      typeof window === "undefined" ||
      typeof window.matchMedia !== "function"
    ) {
      return null;
    }

    if (window.matchMedia("(pointer: fine)").matches) {
      return "mouse";
    }

    if (window.matchMedia("(pointer: coarse)").matches) {
      return "touch";
    }

    return null;
  };

  const [pointerType, setPointerType] = useState<
    "mouse" | "touch" | "pen" | null
  >(() => getInitialPointerType());

  useEffect(() => {
    if (typeof window === "undefined") return;

    const updatePointerType = (e: PointerEvent) => {
      if (
        e.pointerType === "mouse" ||
        e.pointerType === "touch" ||
        e.pointerType === "pen"
      ) {
        setPointerType(e.pointerType);
      }
    };

    window.addEventListener("pointerdown", updatePointerType, {
      passive: true,
    });

    return () => {
      window.removeEventListener("pointerdown", updatePointerType);
    };
  }, []);

  return pointerType;
}

export default useActivePointerType;
