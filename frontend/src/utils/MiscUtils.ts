/**
 * Miscellaneous items for global use.
 * TODO: Evaluate which items should be moved to a more specific location.
 *
 * @author Bradley Baysinger
 * @since 2025
 * @version N/A
 */
export default class MiscUtils {
  /**
   * Provides an alternate route that makes a link active.
   *
   * @returns
   */
  static isActiveOrAlt(
    isActive: boolean,
    optionalRoute: string,
    activeClassNames: string,
  ): string {
    if (
      typeof window !== "undefined" &&
      window.location.pathname === optionalRoute
    ) {
      return activeClassNames;
    }
    return isActive ? activeClassNames : "";
  }

  /**
   * safeUUID
   *
   * Generates a UUID using `crypto.randomUUID()` when available,
   * with a fallback for environments that do not support it — such as
   * older versions of iOS Safari (e.g. iOS Safari 18.4 and below).
   */
  static safeUUID(): string {
    if (
      typeof crypto !== "undefined" &&
      typeof crypto.randomUUID === "function"
    ) {
      return crypto.randomUUID();
    }

    // Polyfill version — RFC4122 v4 compliant
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
      /[xy]/g,
      function (c) {
        const r = crypto.getRandomValues(new Uint8Array(1))[0] % 16 | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      },
    );
  }
  static smoothStep = (edge0: number, edge1: number, x: number) => {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
  };
}
