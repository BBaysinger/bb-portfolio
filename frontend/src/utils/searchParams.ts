/**
 * Reads a search param from the current browser location.
 * Safe for client-only callers that may render during SSR.
 */
export function getLocationSearchParam(name: string, fallback = ""): string {
  if (typeof window === "undefined") return fallback;
  return getSearchParam(window.location.search, name, fallback);
}

/**
 * Reads a search param from a provided search string.
 */
export function getSearchParam(
  search: string,
  name: string,
  fallback = "",
): string {
  try {
    return new URLSearchParams(search).get(name) ?? fallback;
  } catch {
    return fallback;
  }
}
