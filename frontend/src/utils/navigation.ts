/**
 * Central navigation utility that combines history.pushState with custom event dispatch
 * to ensure all components stay in sync during programmatic navigation.
 *
 * Important: Browser “transient user activation” matters
 * -----------------------------------------------
 * Browsers give special treatment to history entries pushed during a trusted
 * user gesture (e.g., click, keyup). Back/Forward tends to step through those
 * entries reliably. The same pushState executed outside a user gesture can be
 * coalesced by some UAs, especially during gesture-driven navigation.
 *
 * In practice for this app: a user click into the carousel establishes the
 * activation window, so pushes that follow behave like user-initiated steps.
 * If you ever see Back skipping some entries, invoke navigation from inside
 * the actual gesture commit (e.g., pointerup) rather than after async work.
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
  opts?: {
    /** When true, use a double-push fallback (push dummy, then replace real) to avoid coalescing on gesture back/forward */
    useDoublePushFallback?: boolean;
    /** Hash key to use for the dummy entry when double-push is enabled (default: "dp") */
    dummyHashParam?: string;
  },
): void {
  if (typeof window === "undefined") return;
  const DEBUG_NAV = process.env.NEXT_PUBLIC_DEBUG_NAVIGATION === "1";

  // If the navigation is triggered without transient user activation, some browsers may
  // treat history changes as lower-priority for Back/Forward traversal. While we cannot
  // synthesize activation, we can optionally warn so callers can choose to only invoke
  // this inside trusted event handlers.
  // Tip specific to this project: Clicking into the carousel counts as a fresh
  // activation, which made Back/Forward behave perfectly in manual testing.
  try {
    // Heuristic: if a helper tracked a recent user activation timestamp on window, use it.
    const lastTs = (window as unknown as { __lastUserActivationTs?: number })
      .__lastUserActivationTs;
    const hasActivation =
      typeof lastTs === "number" && Date.now() - lastTs < 750;
    if (!hasActivation && DEBUG_NAV) {
      console.warn(
        "[navigateWithPushState] Possibly non-user-initiated navigation; Back/Forward may coalesce. Trigger inside a click/keydown if issues persist.",
      );
    }
  } catch {
    /* noop */
  }

  // Build a normalized target URL that preserves search and hash while enforcing
  // a trailing slash on the pathname (to match Next.js `trailingSlash: true`).
  const target = new URL(url, window.location.origin);

  const normalizedPathname = target.pathname.endsWith("/")
    ? target.pathname
    : `${target.pathname}/`;
  const normalizedUrl = `${normalizedPathname}${target.search}${target.hash}`;

  // Current URL composed of pathname + search + hash
  const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;

  // Only navigate if the full URL (path + search + hash) is different
  // Note: Do NOT debounce in this helper. The Project carousel is responsible for
  // stabilizing state and only calling this when a committed navigation should be
  // recorded. Debouncing here can re-order or drop intended entries.
  if (currentUrl !== normalizedUrl) {
    const useDoublePush =
      opts?.useDoublePushFallback ||
      process.env.NEXT_PUBLIC_DOUBLE_PUSH === "1";

    if (useDoublePush) {
      // Craft a dummy URL by adding a benign hash param (e.g., #dp=timestamp),
      // then replace it with the final URL on the next macrotask/frame. This yields
      // a single net new entry that browsers are less likely to coalesce.
      const dummyKey = (opts?.dummyHashParam || "dp").toString();
      const dummyTarget = new URL(normalizedUrl, window.location.origin);
      const dummyHash = (dummyTarget.hash || "").replace(/^#/, "");
      const dummyParams = new URLSearchParams(dummyHash);
      dummyParams.set(dummyKey, Date.now().toString());
      const dummyUrl = `${dummyTarget.pathname}${dummyTarget.search}#${dummyParams.toString()}`;

      if (DEBUG_NAV)
        console.info(`Navigating (double-push) to ${normalizedUrl}`);
      window.history.pushState(state || null, "", dummyUrl);
      // Defer replace to allow the history entry to settle
      setTimeout(() => {
        if (typeof window.requestAnimationFrame === "function") {
          window.requestAnimationFrame(() => {
            window.history.replaceState(state || null, "", normalizedUrl);
            window.dispatchEvent(new CustomEvent("bb:routechange"));
          });
        } else {
          window.history.replaceState(state || null, "", normalizedUrl);
          window.dispatchEvent(new CustomEvent("bb:routechange"));
        }
      }, 0);
    } else {
      if (DEBUG_NAV) console.info(`Navigating to ${normalizedUrl}`);
      window.history.pushState(state || null, "", normalizedUrl);
      // Emit custom event so listeners (e.g., useRouteChange) react to this change
      window.dispatchEvent(new CustomEvent("bb:routechange"));
    }
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
  const DEBUG_NAV = process.env.NEXT_PUBLIC_DEBUG_NAVIGATION === "1";

  const target = new URL(url, window.location.origin);
  const normalizedPathname = target.pathname.endsWith("/")
    ? target.pathname
    : `${target.pathname}/`;
  const normalizedUrl = `${normalizedPathname}${target.search}${target.hash}`;

  if (DEBUG_NAV) console.info(`Replacing URL with ${normalizedUrl}`);
  window.history.replaceState(state || null, "", normalizedUrl);
  // Emit custom event so listeners are notified of the change
  window.dispatchEvent(new CustomEvent("bb:routechange"));
}
