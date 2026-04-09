"use client";

/**
 * Returns the best-available viewport height in CSS pixels.
 *
 * On iOS (including Chrome iOS), `visualViewport.height` often better reflects
 * the actually visible area than `window.innerHeight`.
 */
export function getViewportHeightPx(): number {
  if (typeof window === "undefined") return 0;

  const candidates = [
    window.visualViewport?.height,
    window.innerHeight,
    document.documentElement?.clientHeight,
    document.body?.clientHeight,
  ];

  for (const candidate of candidates) {
    if (typeof candidate !== "number") continue;
    if (!Number.isFinite(candidate) || candidate <= 0) continue;
    return Math.round(candidate);
  }

  return 0;
}
