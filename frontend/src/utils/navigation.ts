/**
 * Central navigation utility that combines history.pushState with custom event dispatch
 * to ensure all components stay in sync during programmatic navigation.
 */

/**
 * Navigate to a new URL using pushState and notify all listeners.
 * This replaces direct calls to window.history.pushState() to ensure
 * components using useRouteChange hook are properly notified.
 *
 * @param url - The URL to navigate to
 * @param state - Optional state object to store with the history entry
 */
export function navigateWithPushState(
  url: string,
  state?: Record<string, unknown> | null,
): void {
  if (typeof window === "undefined") return;

  // Normalize to trailing slash to match Next.js `trailingSlash: true`
  const normalizedUrl = url.endsWith("/") ? url : `${url}/`;

  // Only navigate if URL is different
  if (window.location.pathname !== normalizedUrl) {
    console.info(`Navigating to ${normalizedUrl}`);
    window.history.pushState(state || null, "", normalizedUrl);
    // Emit custom event so listeners (e.g., useRouteChange) react to this change
    window.dispatchEvent(new CustomEvent("bb:routechange"));
  }
}

/**
 * Replace the current URL using replaceState and notify all listeners.
 *
 * @param url - The URL to replace with
 * @param state - Optional state object to store with the history entry
 */
export function replaceWithReplaceState(
  url: string,
  state?: Record<string, unknown> | null,
): void {
  if (typeof window === "undefined") return;

  const normalizedUrl = url.endsWith("/") ? url : `${url}/`;

  console.info(`Replacing URL with ${normalizedUrl}`);
  window.history.replaceState(state || null, "", normalizedUrl);
  // Emit custom event so listeners are notified of the change
  window.dispatchEvent(new CustomEvent("bb:routechange"));
}
