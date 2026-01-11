"use client";

/**
 * Returns the best-available viewport height in CSS pixels.
 *
 * On iOS (including Chrome iOS), `visualViewport.height` often better reflects
 * the actually visible area than `window.innerHeight`.
 */
export function getViewportHeightPx(): number {
  if (typeof window === "undefined") return 0;

  const visual = window.visualViewport?.height;
  return Math.round((visual ?? window.innerHeight) || 0);
}
