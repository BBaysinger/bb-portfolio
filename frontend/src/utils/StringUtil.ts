/**
 *
 *
 * @export
 * @class StringUtil
 */
export default class StringUtil {
  /**
   * Converts strings to Booleans based on their contents.
   *
   */
  static stringToBool(str: string | null): boolean {
    if (str === null) return false;

    switch (str.toLowerCase()) {
      case "false":
        return false;
      case "0":
        return false;
      case "n":
        return false;
      case "no":
        return false;

      case "true":
        return true;
      case "1":
        return true;
      case "y":
        return true;
      case "yes":
        return true;

      default:
        return false;
    }
  }
}
