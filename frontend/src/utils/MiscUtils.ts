/**
 * Miscellaneous items for global use.
 *
 * @author Bradley Baysinger
 * @since The beginning of time.
 * @version N/A
 */
export default class MiscUtils {
  /**
   * Provides an alternate route that makes a link active.
   *
   * @returns
   */
  static isActiveOrAlt(
    isActive: any,
    optionalRoute: string,
    activeClassNames: string,
  ) {
    return isActive || window.location.pathname === optionalRoute
      ? activeClassNames
      : "";
  }
}
