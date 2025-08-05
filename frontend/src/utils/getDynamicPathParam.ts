/**
 * Gets a dynamic path segment from the current URL.
 * This is a safe, client-only utility that extracts a segment from the pathname.
 *
 * @param segmentIndex - Index of the pathname segment (e.g. -1 = last).
 * @param fallback - A fallback value for SSR/SSG or missing segment.
 * @returns The segment at the given index, or the fallback.
 */
export function getDynamicPathParam(
  segmentIndex: number,
  fallback?: string,
): string {
  if (typeof window === "undefined") return fallback ?? "";

  const segments = window.location.pathname.split("/").filter(Boolean);
  return segments.at(segmentIndex) ?? fallback ?? "";
}
